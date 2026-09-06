import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8200 + Math.floor(Math.random() * 700);
const dataFile = join(tmpdir(), `northstar-estimate-media-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('estimate media test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const createdCustomer = await post('/api/customers', { name: 'Estimate Media Customer', phone: '843-555-0177', location: '1 Media Way' }, { ...auth, 'idempotency-key': 'estimate-media-customer' });
  const customer = createdCustomer.body.customer || createdCustomer.body;
  const estimate = await post('/api/estimates', { customerId: customer.id, service: 'Diagnostic visit', amount: 245 }, { ...auth, 'idempotency-key': 'estimate-media-create' });
  const media = await post(`/api/estimates/${estimate.body.id}/media`, { url: 'https://cdn.example.test/diagnostic.jpg', caption: 'Existing equipment reference', kind: 'reference' }, { ...auth, 'idempotency-key': 'estimate-media-1' });
  const duplicate = await post(`/api/estimates/${estimate.body.id}/media`, { url: 'https://cdn.example.test/diagnostic.jpg', caption: 'Existing equipment reference', kind: 'reference' }, { ...auth, 'idempotency-key': 'estimate-media-1' });
  const publicMedia = await request(`/api/public/estimate/media?token=${encodeURIComponent(estimate.body.estimateApprovalToken)}`);
  const invalid = await post(`/api/estimates/${estimate.body.id}/media`, { url: 'http://insecure.example.test/photo.jpg' }, { ...auth, 'idempotency-key': 'estimate-media-invalid' });
  if (!login.response.ok || !customer?.id || !estimate.response.ok || media.response.status !== 201 || !media.body.media?.id || duplicate.response.status !== 200 || !duplicate.body.duplicate || publicMedia.response.status !== 200 || publicMedia.body.media?.[0]?.url !== 'https://cdn.example.test/diagnostic.jpg' || invalid.response.status !== 422) throw new Error('estimate media was not safely attached, projected, or deduplicated');
  console.log('Northstar estimate media test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
