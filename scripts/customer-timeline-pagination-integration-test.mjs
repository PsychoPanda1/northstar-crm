import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-customer-timeline-${suffix}.json`);
const sessionFile = `${dataFile}.sessions`;
const port = 5800 + Math.floor(Math.random() * 100);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const cleanup = () => { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) unlinkSync(file); };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, token, idempotencyKey) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('customer timeline pagination test server did not start'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=default', { service: 'default', role: 'owner' });
  assert(login.response.ok && login.body.token, 'customer timeline pagination login failed');
  const token = login.body.token;
  const customer = await post('/api/customers', { name: 'Timeline Customer', phone: '843-555-0391', email: 'timeline@example.test', location: '1 Timeline Street' }, token, 'timeline-customer');
  assert(customer.response.status === 201, 'customer timeline pagination setup failed');
  for (let index = 0; index < 5; index += 1) {
    const activity = await post('/api/activities', { customerId: customer.body.id, channel: 'Note', note: `Timeline event ${index}` }, token, `timeline-event-${index}`);
    assert(activity.response.status === 201, 'customer timeline activity setup failed');
  }
  const first = await request(`/api/customers/${encodeURIComponent(customer.body.id)}/timeline?limit=2&offset=0`, { headers: { authorization: `Bearer ${token}` } });
  const second = await request(`/api/customers/${encodeURIComponent(customer.body.id)}/timeline?limit=2&offset=2`, { headers: { authorization: `Bearer ${token}` } });
  const invalid = await request(`/api/customers/${encodeURIComponent(customer.body.id)}/timeline?limit=101&offset=0`, { headers: { authorization: `Bearer ${token}` } });
  assert(first.response.ok && first.body.items?.length === 2 && first.body.pagination?.hasMore === true && first.body.pagination?.nextOffset === 2, 'first customer timeline page was incorrect');
  assert(second.response.ok && second.body.items?.length === 2 && second.body.items[0].id !== first.body.items[0].id && second.body.pagination?.offset === 2, 'second customer timeline page was incorrect');
  assert(invalid.response.status === 422 && invalid.body.error === 'timeline_limit_and_offset_out_of_range', 'invalid customer timeline pagination was not rejected');
  console.log('Northstar customer timeline pagination integration test passed');
} finally { cleanup(); }
