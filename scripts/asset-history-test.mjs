import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-asset-history-${suffix}.json`);
const port = 10000 + ((process.pid + Date.now()) % 40000);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const child = spawn(process.execPath, ['server.mjs'], { env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const waitForServer = async () => { for (let attempt = 0; attempt < 800; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error('asset history test server did not start'); };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const cleanup = () => { child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); };

try {
  await waitForServer();
  const login = await request('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'default', role: 'owner' }) });
  if (!login.response.ok) throw new Error('asset history login failed');
  const auth = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const customer = await request('/api/customers', { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ name: 'History Customer', phone: '843-555-0197', location: '12 History Lane' }) });
  if (customer.response.status !== 201) throw new Error('asset history customer failed');
  const asset = await request('/api/assets', { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ customerId: customer.body.id, name: 'Heat pump', serial: 'HP-42', installed: '2023-06-01' }) });
  if (asset.response.status !== 201) throw new Error('asset history asset failed');
  const job = await request('/api/jobs', { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ customerId: customer.body.id, service: 'Heat pump maintenance', time: 'Tomorrow 9:00 AM' }) });
  if (job.response.status !== 201) throw new Error('asset history job failed');
  const linked = await request(`/api/jobs/${encodeURIComponent(job.body.id)}/asset`, { method: 'POST', headers: { ...auth, 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ assetId: asset.body.id }) });
  if (!linked.response.ok) throw new Error('asset history link failed');
  const history = await request(`/api/assets/${encodeURIComponent(asset.body.id)}/history`, { headers: auth });
  const forbidden = await request(`/api/assets/${encodeURIComponent(asset.body.id)}/history`, { headers: { authorization: 'Bearer invalid' } });
  if (history.response.status !== 200 || history.body.asset?.id !== asset.body.id || history.body.summary?.visits !== 1 || history.body.jobs?.[0]?.id !== job.body.id || forbidden.response.status !== 401) throw new Error('asset service history contract failed');
  console.log('Northstar asset history test passed');
} finally { cleanup(); }
