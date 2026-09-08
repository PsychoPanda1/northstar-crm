import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7700 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-customer-preferences-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('customer preferences test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'preferences-customer', tenantId, name: 'Preferences Customer', phone: '8435550111', contactPreferences: { smsOptOut: false, emailOptOut: false } }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` }; const headers = { ...auth, 'idempotency-key': 'customer-preferences-1' };
  const customerHeaders = { ...auth, 'content-type': 'application/json', 'idempotency-key': 'customer-create-retry-1' };
  const customerCreate = await request('/api/customers', { method: 'POST', headers: customerHeaders, body: JSON.stringify({ name: 'Create Retry Customer', phone: '8435550222', email: 'create-retry@example.com', location: '1 Retry Lane' }) });
  const customerConflict = await request('/api/customers', { method: 'POST', headers: customerHeaders, body: JSON.stringify({ name: 'Changed Retry Customer', phone: '8435550222', email: 'create-retry@example.com', location: '2 Retry Lane' }) });
  const saved = await post('/api/customers/preferences-customer/preferences', { smsOptOut: true, emailOptOut: false }, headers);
  const duplicate = await post('/api/customers/preferences-customer/preferences', { smsOptOut: true, emailOptOut: false }, headers);
  const conflict = await post('/api/customers/preferences-customer/preferences', { smsOptOut: false, emailOptOut: true }, headers);
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId]; const preferenceCustomer = persisted.customers.find((item) => item.id === 'preferences-customer');
  const audits = (persisted.auditEvents || []).filter((item) => item.action === 'customer.contact_preferences.updated');
  if (!login.response.ok || customerCreate.response.status !== 201 || customerConflict.response.status !== 409 || customerConflict.body.error !== 'idempotency_key_reused' || saved.response.status !== 200 || saved.body.duplicate || saved.body.contactPreferences?.smsOptOut !== true || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || preferenceCustomer?.contactPreferences?.smsOptOut !== true || preferenceCustomer?.contactPreferencesIdempotencyKey !== 'customer-preferences-1' || audits.length !== 1) throw new Error('customer preference or create idempotency contract failed');
  console.log('Northstar customer preference idempotency test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
