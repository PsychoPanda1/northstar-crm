import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9900 + Math.floor(Math.random() * 50);
const dataFile = join(tmpdir(), `northstar-payroll-runs-${process.pid}-${Date.now()}.json`);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` }, stdio: 'ignore' });
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const login = async (role) => request(`/api/auth/demo-login?service=plumbing&role=${role}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role }) });
const post = (path, body, token, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });
try {
  for (let attempt = 0; attempt < 160; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 159) throw new Error('payroll run server did not start'); }
  const ownerLogin = await login('owner');
  const technicianLogin = await login('technician');
  if (!ownerLogin.response.ok || !technicianLogin.response.ok) throw new Error('payroll run login failed');
  const ownerToken = ownerLogin.body.token;
  const first = await post('/api/payroll/runs', { startDate: '2026-09-01', endDate: '2026-09-30' }, ownerToken, 'payroll-run-1');
  const duplicate = await post('/api/payroll/runs', { startDate: '2026-09-01', endDate: '2026-09-30' }, ownerToken, 'payroll-run-1');
  if (first.response.status !== 201 || duplicate.response.status !== 200 || !duplicate.body.duplicate || first.body.status !== 'Draft' || first.body.totals === undefined) throw new Error('payroll period snapshot was not created or deduplicated');
  const approved = await post(`/api/payroll/runs/${encodeURIComponent(first.body.id)}/approve`, {}, ownerToken, `approve:${first.body.id}`);
  const approvedAgain = await post(`/api/payroll/runs/${encodeURIComponent(first.body.id)}/approve`, {}, ownerToken, `approve:${first.body.id}`);
  if (approved.response.status !== 200 || approved.body.status !== 'Approved' || approvedAgain.response.status !== 200 || !approvedAgain.body.duplicate) throw new Error('payroll period approval was not idempotent');
  const forbidden = await post('/api/payroll/runs', {}, technicianLogin.body.token, 'payroll-run-technician');
  if (forbidden.response.status !== 403) throw new Error('technician could create payroll period');
  const list = await request('/api/payroll/runs', { headers: { authorization: `Bearer ${ownerToken}` } });
  if (!list.response.ok || list.body.items?.[0]?.status !== 'Approved') throw new Error('approved payroll period was not listed');
  console.log('Northstar payroll run test passed');
} finally { child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
