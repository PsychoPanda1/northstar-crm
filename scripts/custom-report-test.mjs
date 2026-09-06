import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8500 + Math.floor(Math.random() * 700);
const dataFile = join(tmpdir(), `northstar-custom-report-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('custom report test server did not start'); };

try {
  writeFileSync(dataFile, '{}');
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const available = await request('/api/reports/custom', { headers });
  const selected = await request('/api/reports/custom?metric=Cash%20collected&metric=No-shows', { headers });
  const ranged = await request('/api/reports/custom?metric=Cash%20collected&startDate=2026-01-01&endDate=2026-01-31', { headers });
  const invalidRange = await request('/api/reports/custom?startDate=2026-02-01&endDate=2026-01-31', { headers });
  const marketingRanged = await request('/api/reports/marketing?startDate=2026-01-01&endDate=2026-01-31', { headers });
  const marketingInvalidRange = await request('/api/reports/marketing?startDate=bad-date', { headers });
  const unknown = await request('/api/reports/custom?metric=Secret%20metric', { headers });
  const preferences = await request('/api/reports/custom/preferences', { headers });
  const saved = await request('/api/reports/custom/preferences', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'custom-report-preferences-test' }, body: JSON.stringify({ metrics: ['Cash collected', 'Gross margin'] }) });
  const persisted = await request('/api/reports/custom/preferences', { headers });
  const duplicate = await request('/api/reports/custom/preferences', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'custom-report-preferences-test' }, body: JSON.stringify({ metrics: ['Cash collected', 'Gross margin'] }) });
  const dispatcherLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'dispatcher' });
  const dispatcherWrite = await request('/api/reports/custom/preferences', { method: 'PATCH', headers: { authorization: `Bearer ${dispatcherLogin.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'dispatcher-report-preferences-test' }, body: JSON.stringify({ metrics: ['Cash collected'] }) });
  if (!login.response.ok || available.response.status !== 200 || available.body.metrics?.length !== 8 || !available.body.availableMetrics?.includes('Gross margin') || selected.response.status !== 200 || selected.body.metrics?.length !== 2 || selected.body.metrics[0]?.label !== 'No-shows' || selected.body.metrics[1]?.label !== 'Cash collected' || ranged.response.status !== 200 || ranged.body.period !== '2026-01-01 to 2026-01-31' || ranged.body.metrics?.length !== 1 || invalidRange.response.status !== 422 || invalidRange.body.error !== 'valid_report_date_range_required' || marketingRanged.response.status !== 200 || marketingRanged.body.period !== '2026-01-01 to 2026-01-31' || !Array.isArray(marketingRanged.body.campaigns) || marketingInvalidRange.response.status !== 422 || marketingInvalidRange.body.error !== 'valid_report_date_range_required' || unknown.response.status !== 422 || preferences.response.status !== 200 || saved.response.status !== 200 || persisted.body.metrics?.join('|') !== 'Cash collected|Gross margin' || duplicate.body.duplicate !== true || !dispatcherLogin.response.ok || dispatcherWrite.response.status !== 403) throw new Error('custom report metric selection, date range, marketing reporting, persistence, or role enforcement failed');
  console.log('Northstar custom report test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
