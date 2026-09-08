import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7300 + Math.floor(Math.random() * 400);
const dataFile = join(tmpdir(), `northstar-job-dispatch-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const jobId = 'dispatch-retry-job';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('job dispatch idempotency test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'dispatch-customer', tenantId, name: 'Dispatch Customer', phone: '8435550188', location: '1 Route Way' }], jobs: [{ id: jobId, tenantId, customerId: 'dispatch-customer', customer: 'Dispatch Customer', service: 'Plumbing repair', technician: null, status: 'Unassigned', time: 'Tomorrow 9:00 AM' }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const assignmentHeaders = { ...auth, 'idempotency-key': 'dispatch-assignment-1' };
  const assigned = await post(`/api/jobs/${jobId}/assign`, { technician: 'Alex Rivera' }, assignmentHeaders);
  const assignmentDuplicate = await post(`/api/jobs/${jobId}/assign`, { technician: 'Alex Rivera' }, assignmentHeaders);
  const assignmentConflict = await post(`/api/jobs/${jobId}/assign`, { technician: 'Taylor Brooks' }, assignmentHeaders);
  const statusHeaders = { ...auth, 'idempotency-key': 'dispatch-status-1' };
  const enRoute = await post(`/api/jobs/${jobId}/status`, { status: 'En route' }, statusHeaders);
  const statusDuplicate = await post(`/api/jobs/${jobId}/status`, { status: 'En route' }, statusHeaders);
  const statusConflict = await post(`/api/jobs/${jobId}/status`, { status: 'In progress' }, statusHeaders);
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const savedJob = saved.jobs.find((item) => item.id === jobId);
  const audits = (saved.auditEvents || []).filter((item) => ['job.assigned', 'job.status.updated'].includes(item.action));
  if (!login.response.ok || assigned.response.status !== 200 || assigned.body.duplicate || assigned.body.technician !== 'Alex Rivera' || assignmentDuplicate.response.status !== 200 || !assignmentDuplicate.body.duplicate || assignmentConflict.response.status !== 409 || assignmentConflict.body.error !== 'idempotency_key_reused' || enRoute.response.status !== 200 || enRoute.body.status !== 'En route' || statusDuplicate.response.status !== 200 || !statusDuplicate.body.duplicate || statusConflict.response.status !== 409 || statusConflict.body.error !== 'idempotency_key_reused' || savedJob?.status !== 'En route' || savedJob?.assignmentIdempotencyKey !== 'dispatch-assignment-1' || savedJob?.statusIdempotencyKey !== 'dispatch-status-1' || audits.length !== 2) throw new Error('single-job dispatch mutations did not deduplicate or reject idempotency-key reuse');
  console.log('Northstar single-job dispatch idempotency test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
