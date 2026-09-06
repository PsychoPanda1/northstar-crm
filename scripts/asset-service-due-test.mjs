import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-asset-due-${suffix}.json`);
const port = 4700 + (process.pid % 500);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const child = spawn(process.execPath, ['server.mjs'], { env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error('asset due test server did not start'); };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const cleanup = () => { child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); };
try {
  await waitForServer();
  const login = await request('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'default', role: 'owner' }) });
  if (!login.response.ok) throw new Error('asset due test login failed');
  const auth = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const customer = await request('/api/customers', { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ name: 'Asset Due Customer', phone: '843-555-0199', location: '9 Reminder Lane' }) });
  if (customer.response.status !== 201) throw new Error('asset due test customer failed');
  const asset = await request('/api/assets', { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ customerId: customer.body.id, name: 'Tankless water heater', serial: 'WH-9', installed: '2024-01-01', nextServiceDue: '2099-04-15' }) });
  if (asset.response.status !== 201 || asset.body.nextServiceDue !== '2099-04-15') throw new Error('asset service due creation failed');
  const listed = await request('/api/assets?search=Asset%20Due%20Customer', { headers: auth });
  if (!listed.response.ok || listed.body.items?.[0]?.serviceDueStatus !== 'Scheduled') throw new Error('asset service due status projection failed');
  const alertAsset = await request(`/api/assets/${encodeURIComponent(asset.body.id)}`, { method: 'PATCH', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ nextServiceDue: '2000-04-15' }) });
  const notifications = await request('/api/notifications', { headers: auth });
  if (!alertAsset.response.ok || !notifications.body.items?.some((item) => item.assetId === asset.body.id && item.title === 'Asset service overdue')) throw new Error('asset service due alert was not surfaced');
  const invalid = await request(`/api/assets/${encodeURIComponent(asset.body.id)}`, { method: 'PATCH', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ nextServiceDue: 'not-a-date' }) });
  if (invalid.response.status !== 422) throw new Error('invalid service due date was accepted');
  console.log('Northstar asset service due test passed');
} finally { cleanup(); }
