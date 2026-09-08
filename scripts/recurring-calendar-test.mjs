import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7600 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-recurring-calendar-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'recurring-calendar-customer', tenantId, name: 'Calendar Customer', phone: '8435550114', location: '1 Calendar Way' }], plans: [], jobs: [], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 300; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 299) throw new Error('recurring calendar test server did not start'); }
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const authorization = `Bearer ${login.body.token}`;
  const created = await post('/api/plans', { customerId: 'recurring-calendar-customer', service: 'Monthly plumbing care', amount: 129, renewal: 'Monthly', billingSchedule: 'Monthly' }, { authorization, 'idempotency-key': 'recurring-calendar-plan' });
  const scheduled = await post(`/api/plans/${created.body.id}/schedule`, { firstStartsAt: '2099-01-31T14:00:00.000Z', firstEndsAt: '2099-01-31T15:00:00.000Z', time: '9:00 AM', visits: 3, frequency: 'Monthly' }, { authorization, 'idempotency-key': 'recurring-calendar-schedule' });
  const duplicate = await post(`/api/plans/${created.body.id}/schedule`, { firstStartsAt: '2099-01-31T14:00:00.000Z', firstEndsAt: '2099-01-31T15:00:00.000Z', time: '9:00 AM', visits: 3, frequency: 'Monthly' }, { authorization, 'idempotency-key': 'recurring-calendar-schedule' });
  const jobs = scheduled.body.scheduledJobs || [];
  assert(login.response.ok && created.response.status === 201 && scheduled.response.status === 201 && jobs.length === 3, 'recurring schedule was not created');
  assert(jobs.map((job) => job.startsAt).join(',') === '2099-01-31T14:00:00.000Z,2099-02-28T14:00:00.000Z,2099-03-31T14:00:00.000Z', 'monthly recurrence did not clamp end-of-month dates');
  assert(jobs.every((job) => job.recurringSeriesId === scheduled.body.plan.recurringSeriesId && job.recurrenceIndex >= 1), 'recurring series metadata was not preserved');
  assert(duplicate.response.status === 200 && duplicate.body.duplicate === true && duplicate.body.scheduledJobs.length === 3, 'recurring schedule replay was not idempotent');
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  assert(saved.jobs.filter((job) => job.recurringSeriesId === scheduled.body.plan.recurringSeriesId).length === 3, 'recurring schedule created duplicate or incomplete jobs');
  console.log('Northstar recurring calendar test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
