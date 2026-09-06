import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4800 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-source-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead source test server did not start'); };
const postJson = (path, body, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const first = await postJson('/api/public/leads?service=plumbing', { name: 'Organic Source Test', phone: '843-555-0171', source: 'Google Local Services' }, 'lead-source-google');
  const second = await postJson('/api/public/leads?service=plumbing', { name: 'Referral Source Test', phone: '843-555-0172', source: 'Neighbor referral' }, 'lead-source-referral');
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' }, 'lead-source-login');
  if (!first.response.ok || !second.response.ok || !login.response.ok) throw new Error('lead source test setup failed');
  const token = login.body.token;
  const filtered = await request('/api/leads?source=google', { headers: { authorization: `Bearer ${token}` } });
  const invalidStatus = await request('/api/leads?status=NotAStage', { headers: { authorization: `Bearer ${token}` } });
  const filteredItems = filtered.body.items || [];
  if (filtered.response.status !== 200 || !filteredItems.some((item) => item.id === first.body.id) || filteredItems.some((item) => !String(item.source || '').toLowerCase().includes('google')) || invalidStatus.response.status !== 422) throw new Error('lead source filtering or validation failed');
  console.log('Northstar lead source filter test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
