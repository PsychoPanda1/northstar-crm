import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8500 + Math.floor(Math.random() * 700);
const dataFile = join(tmpdir(), `northstar-report-schedule-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15' };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('report schedule test server did not start'); };

try {
  const view = { id: 'RV-SCHEDULE-1', tenantId: 'clearwater-plumbing', name: 'Weekly owner report', metrics: ['Cash collected', 'Gross margin'], filters: {}, groupBy: 'service', startDate: '', endDate: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'Test owner' };
  writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { reportViews: [view], reportSchedules: [{ id: 'RS-DUE-1', tenantId: 'clearwater-plumbing', viewId: view.id, name: view.name, recipient: 'owner@example.com', frequency: 'weekly', enabled: true, nextRunAt: new Date(Date.now() - 60_000).toISOString(), createdAt: view.createdAt, updatedAt: view.updatedAt }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const schedules = await request('/api/reports/custom/schedules', { headers });
  const messages = await request('/api/messages', { headers });
  const created = await request('/api/reports/custom/schedules', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'report-schedule-create-test' }, body: JSON.stringify({ viewId: view.id, recipient: 'reports@example.com', frequency: 'monthly', nextRunAt: new Date(Date.now() + 86400000).toISOString() }) });
  const duplicate = await request('/api/reports/custom/schedules', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'report-schedule-create-test' }, body: JSON.stringify({ viewId: view.id, recipient: 'reports@example.com', frequency: 'monthly', nextRunAt: created.body.schedule?.nextRunAt }) });
  const invalid = await request('/api/reports/custom/schedules', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ viewId: view.id, recipient: 'not-an-email', frequency: 'weekly' }) });
  const updated = await request(`/api/reports/custom/schedules/${encodeURIComponent(created.body.schedule?.id || '')}`, { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ enabled: false, frequency: 'daily' }) });
  if (!login.response.ok || schedules.response.status !== 200 || schedules.body.schedules?.[0]?.id !== 'RS-DUE-1' || messages.response.status !== 200 || !messages.body.items?.some((item) => item.reportScheduleId === 'RS-DUE-1' && item.template === 'scheduled_report' && item.to === 'owner@example.com' && item.reportCsv?.includes('"group","metric","value","detail"')) || created.response.status !== 201 || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || invalid.response.status !== 422 || updated.response.status !== 200 || updated.body.schedule?.enabled !== false) throw new Error('scheduled report creation, idempotency, validation, automation queue, or update failed');
  console.log('Northstar report schedule test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
