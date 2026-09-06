import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6800 + Math.floor(Math.random() * 800);
const dataFile = join(tmpdir(), `northstar-plan-status-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const planId = 'PLAN-lifecycle-test';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('plan status test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'plan-status-customer', tenantId, name: 'Plan Status Customer', phone: '8435550101', location: '1 Plan Way' }], plans: [{ id: planId, tenantId, customerId: 'plan-status-customer', customer: 'Plan Status Customer', service: 'Annual plumbing care', amount: 120, value: '$120.00 / month', status: 'Active', renewal: 'Monthly' }], jobs: [{ id: 'plan-status-job', tenantId, planId, customerId: 'plan-status-customer', customer: 'Plan Status Customer', service: 'Annual plumbing care', status: 'Confirmed', time: '2099-01-03 09:00 AM', startsAt: '2099-01-03T14:00:00.000Z', endsAt: '2099-01-03T15:00:00.000Z' }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const authorization = `Bearer ${login.body.token}`;
  const pauseHeaders = { authorization, 'idempotency-key': 'plan-status-pause-1' };
  const paused = await post(`/api/plans/${planId}/pause`, { note: 'Seasonal pause' }, pauseHeaders);
  const duplicatePause = await post(`/api/plans/${planId}/pause`, { note: 'Seasonal pause' }, pauseHeaders);
  const conflict = await post(`/api/plans/${planId}/pause`, { note: 'Changed note' }, pauseHeaders);
  const resumed = await post(`/api/plans/${planId}/resume`, {}, { authorization, 'idempotency-key': 'plan-status-resume-1' });
  const canceled = await post(`/api/plans/${planId}/cancel`, { note: 'Customer ended membership' }, { authorization, 'idempotency-key': 'plan-status-cancel-1' });
  const duplicateCancel = await post(`/api/plans/${planId}/cancel`, { note: 'Customer ended membership' }, { authorization, 'idempotency-key': 'plan-status-cancel-1' });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || paused.response.status !== 200 || paused.body.plan?.status !== 'Paused' || duplicatePause.response.status !== 200 || !duplicatePause.body.duplicate || conflict.response.status !== 409 || resumed.response.status !== 200 || resumed.body.plan?.status !== 'Active' || canceled.response.status !== 200 || canceled.body.plan?.status !== 'Canceled' || canceled.body.canceledJobs !== 1 || duplicateCancel.response.status !== 200 || !duplicateCancel.body.duplicate || saved.jobs[0].status !== 'Canceled' || !saved.auditEvents?.some((entry) => entry.action === 'plan.pause') || !saved.auditEvents?.some((entry) => entry.action === 'plan.resume') || !saved.auditEvents?.some((entry) => entry.action === 'plan.cancel')) throw new Error('plan lifecycle did not transition, deduplicate, cancel future work, or audit safely');
  console.log('Northstar service plan lifecycle test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
