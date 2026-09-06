import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8500 + Math.floor(Math.random() * 700);
const dataFile = join(tmpdir(), `northstar-call-report-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('call report test server did not start'); };

try {
  const receivedAt = new Date().toISOString();
  writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { calls: [{ id: 'CALL-REPORT-1', tenantId: 'clearwater-plumbing', from: '843-555-0101', status: 'Completed', outcome: 'Booked', outcomeBy: 'Jordan Smith', bookedJobId: 'JOB-1', receivedAt }, { id: 'CALL-REPORT-2', tenantId: 'clearwater-plumbing', from: '843-555-0102', status: 'Missed', outcome: 'No answer', receivedAt }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const report = await request(`/api/reports/calls?startDate=${receivedAt.slice(0, 10)}&endDate=${receivedAt.slice(0, 10)}`, { headers });
  const invalid = await request('/api/reports/calls?startDate=bad-date', { headers });
  const dispatcherLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'dispatcher' });
  const dispatcher = await request('/api/reports/calls', { headers: { authorization: `Bearer ${dispatcherLogin.body.token}` } });
  const owner = report.body.owners?.find((item) => item.owner === 'Jordan Smith');
  if (!login.response.ok || report.response.status !== 200 || report.body.totalCalls !== 2 || report.body.answered !== 1 || report.body.missed !== 1 || report.body.booked !== 1 || owner?.conversionRate !== 100 || owner?.answerRate !== 100 || invalid.response.status !== 422 || dispatcher.response.status !== 200) throw new Error('call scorecard totals, owner conversion, date validation, or role access failed');
  console.log('Northstar call report test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
