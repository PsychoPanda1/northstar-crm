import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5200 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-request-conversion-${process.pid}-${Date.now()}.json`);
const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'customer-convert-1', tenantId: 'clearwater-plumbing', name: 'Request Conversion Customer', phone: '843-555-0288', location: '12 Test Lane' }], requests: [{ id: 'REQ-convert-1', tenantId: 'clearwater-plumbing', customerId: 'customer-convert-1', customer: 'Request Conversion Customer', type: 'Question', service: 'Plumbing', message: 'Please schedule a service visit.', priority: 'High', status: 'Open', createdAt: new Date().toISOString() }] } }));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('request conversion server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  if (!login.response.ok) throw new Error('request conversion login failed');
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const key = 'request-conversion-1';
  const first = await request('/api/requests/REQ-convert-1/convert', { method: 'POST', headers: { ...headers, 'idempotency-key': key }, body: JSON.stringify({ time: 'Thursday 10:00 AM', service: 'Drain cleaning', startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }) });
  const duplicate = await request('/api/requests/REQ-convert-1/convert', { method: 'POST', headers: { ...headers, 'idempotency-key': key }, body: JSON.stringify({ time: 'Thursday 10:00 AM', service: 'Drain cleaning', startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }) });
  const conflict = await request('/api/requests/REQ-convert-1/convert', { method: 'POST', headers: { ...headers, 'idempotency-key': key }, body: JSON.stringify({ time: 'Thursday 10:00 AM', service: 'Electrical repair' }) });
  const dispatch = await request('/api/dispatch', { headers });
  const job = first.body.job;
  if (first.response.status !== 201 || !job?.requestId || job.customerId !== 'customer-convert-1' || job.priority !== 'High' || first.body.request?.status !== 'In progress' || duplicate.response.status !== 200 || !duplicate.body.duplicate || duplicate.body.job?.id !== job.id || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || !dispatch.body.items?.some((item) => item.id === job.id)) throw new Error('request conversion behavior failed');
  console.log('Northstar request conversion test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
