import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-customer-merge-${suffix}.json`);
const sessionFile = `${dataFile}.sessions`;
const port = 5600 + Math.floor(Math.random() * 100);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const cleanup = () => { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) unlinkSync(file); };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, token, idempotencyKey) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('customer merge test server did not start'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=default', { service: 'default', role: 'owner' });
  assert(login.response.ok && login.body.token, 'customer merge test login failed');
  const token = login.body.token;
  const targetResult = await post('/api/customers', { name: 'Merge Primary', phone: '843-555-0311', email: 'primary@example.test', location: '1 Main Street' }, token, 'merge-target');
  const sourceResult = await post('/api/customers', { name: 'Merge Duplicate', phone: '843-555-0312', email: 'duplicate@example.test', location: '1 Main Street' }, token, 'merge-source');
  assert(targetResult.response.status === 201 && sourceResult.response.status === 201, 'customer merge test setup failed');
  const targetId = targetResult.body.id; const sourceId = sourceResult.body.id;
  const activity = await post('/api/activities', { customerId: sourceId, channel: 'Note', note: 'Historical duplicate note' }, token, 'merge-source-activity');
  assert(activity.response.status === 201, 'customer merge test linked record setup failed');
  const key = 'merge-customer-operation';
  const merged = await post(`/api/customers/${encodeURIComponent(targetId)}/merge`, { mergeCustomerId: sourceId }, token, key);
  const duplicate = await post(`/api/customers/${encodeURIComponent(targetId)}/merge`, { mergeCustomerId: sourceId }, token, key);
  const targetProfile = await request(`/api/customers/${encodeURIComponent(targetId)}`, { headers: { authorization: `Bearer ${token}` } });
  const sourceProfile = await request(`/api/customers/${encodeURIComponent(sourceId)}`, { headers: { authorization: `Bearer ${token}` } });
  assert(merged.response.ok && merged.body.duplicate === false && merged.body.reassigned >= 1, 'customer merge did not reassign linked records');
  assert(duplicate.response.ok && duplicate.body.duplicate === true, 'customer merge retry was not idempotent');
  assert(targetProfile.response.ok && targetProfile.body.activities.some((item) => item.note === 'Historical duplicate note' && item.customerId === targetId), 'merged history was not visible on canonical customer');
  assert(sourceProfile.response.ok && sourceProfile.body.customer.status === 'Merged' && sourceProfile.body.customer.mergedInto === targetId, 'duplicate customer was not retained as merged');
  console.log('Northstar customer merge test passed');
} finally { cleanup(); }
