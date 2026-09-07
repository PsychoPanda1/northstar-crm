import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9300 + (process.pid % 500);
const dataFile = join(tmpdir(), `northstar-technician-offline-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('technician offline sync test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'offline-customer', tenantId, name: 'Offline Customer', phone: '843-555-0199', location: '1 Sync Way' }], jobs: [{ id: 'JOB-OFFLINE-1', tenantId, customerId: 'offline-customer', customer: 'Offline Customer', service: 'Plumbing', technician: 'Alex Rivera', status: 'En route', priority: 'Normal', time: 'Today 9:00 AM', location: '1 Sync Way', checklist: [{ label: 'Document condition', completed: false }] }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const link = await post('/api/jobs/JOB-OFFLINE-1/technician-link', { technician: 'Alex Rivera' }, { authorization: `Bearer ${login.body.token}` });
  const token = new URL(link.body.url, base).searchParams.get('token');
  const batchId = `SYNC-${Date.now()}`;
  const actions = [{ id: 'ACTION-STATUS-1', path: '/api/public/technician-job/status', method: 'POST', body: { status: 'In progress' }, idempotencyKey: 'offline-status-1' }, { id: 'ACTION-CHECK-1', path: '/api/public/technician-job/checklist', method: 'POST', body: { index: 0, completed: true }, idempotencyKey: 'offline-check-1' }];
  const batch = await post(`/api/public/technician-job/offline-sync?token=${encodeURIComponent(token)}`, { batchId, actions });
  const duplicate = await post(`/api/public/technician-job/offline-sync?token=${encodeURIComponent(token)}`, { batchId, actions });
  const history = await request(`/api/public/technician-job/offline-sync?token=${encodeURIComponent(token)}&limit=10`);
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || link.response.status !== 200 || batch.response.status !== 200 || batch.body.duplicate !== false || batch.body.results?.length !== 2 || batch.body.results.some((item) => !item.ok) || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || history.response.status !== 200 || history.body.batches?.length !== 1 || history.body.batches[0].results?.length !== 2 || history.body.batches[0].results.some((item) => item.body || item.idempotencyKey) || persisted.jobs[0].status !== 'In progress' || persisted.jobs[0].checklist?.[0]?.completed !== true || persisted.technicianSyncBatches?.length !== 1) throw new Error('bounded technician offline sync did not apply, persist, or expose safe receipts');
  console.log('Northstar technician offline sync test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
