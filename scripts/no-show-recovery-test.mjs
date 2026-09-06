import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6700 + Math.floor(Math.random() * 1000);
const dataFile = join(tmpdir(), `northstar-no-show-recovery-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const jobId = 'no-show-recovery-job';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('no-show recovery test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'no-show-customer', tenantId, name: 'No-show Customer', phone: '8435550101', location: '1 Recovery Way' }], jobs: [{ id: jobId, tenantId, customerId: 'no-show-customer', customer: 'No-show Customer', service: 'Emergency plumbing', technician: 'Alex Rivera', status: 'Confirmed', time: 'Tomorrow 9:00 AM', startsAt: '2099-01-02T14:00:00.000Z', endsAt: '2099-01-02T15:00:00.000Z' }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'no-show-recovery-1' };
  const marked = await post(`/api/jobs/${jobId}/no-show`, { reason: 'Customer unavailable at arrival' }, headers);
  const duplicate = await post(`/api/jobs/${jobId}/no-show`, { reason: 'Customer unavailable at arrival' }, headers);
  const conflict = await post(`/api/jobs/${jobId}/no-show`, { reason: 'Different reason' }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'no-show-recovery-2' });
  const availability = await request('/api/public/availability?service=plumbing&days=7');
  const slot = availability.body.slotOptions?.[0];
  const rebook = await post(`/api/jobs/${jobId}/rebook`, { slotId: slot?.id }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'rebook-after-no-show-1' });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const savedJob = saved.jobs.find((item) => item.id === jobId);
  if (!login.response.ok || marked.response.status !== 200 || marked.body.status !== 'No-show' || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflict.response.status !== 409 || availability.response.status !== 200 || !slot || rebook.response.status !== 200 || rebook.body.status !== 'Confirmed' || !savedJob?.rebookedAt || !saved.auditEvents?.some((entry) => entry.action === 'job.no_show') || !saved.auditEvents?.some((entry) => entry.action === 'job.rebooked')) throw new Error('no-show recovery did not transition, deduplicate, audit, or rebook safely');
  console.log('Northstar no-show recovery test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
