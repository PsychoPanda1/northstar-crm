import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5100 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-estimate-options-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('estimate options test server did not start'); };
const postJson = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('estimate options test login failed');
  const token = login.body.token;
  const customer = await postJson('/api/customers', { name: 'Option Package Customer', phone: '843-555-0199', location: 'Package test address' }, token);
  const estimate = await postJson('/api/estimates', { customerId: customer.body.id, service: 'Water heater service', options: [{ label: 'Good', description: 'Repair', amount: 499 }, { label: 'Better', description: 'Repair plus protection', amount: 799 }] }, token);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': 'estimate-options-1' };
  const details = [{ id: 'OPTION-1', items: ['Diagnostic', 'Repair'] }, { id: 'OPTION-2', items: ['Diagnostic', 'Repair', 'Protection plan'] }];
  const updated = await request(`/api/estimates/${estimate.body.id}/options`, { method: 'PATCH', headers, body: JSON.stringify({ options: details }) });
  const duplicate = await request(`/api/estimates/${estimate.body.id}/options`, { method: 'PATCH', headers, body: JSON.stringify({ options: details }) });
  const publicView = await request(`/api/public/estimate?token=${encodeURIComponent(estimate.body.estimateApprovalToken)}`);
  if (customer.response.status !== 201 || estimate.response.status !== 201 || updated.response.status !== 200 || updated.body.estimate?.options?.[1]?.items?.[2] !== 'Protection plan' || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || publicView.response.status !== 200 || publicView.body.options?.[0]?.items?.[0] !== 'Diagnostic') throw new Error('estimate option detail contract failed');
  console.log('Northstar estimate option detail test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
