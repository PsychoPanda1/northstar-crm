import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6800 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-job-priority-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const jobId = 'priority-retry-job';
const terminalJobId = 'priority-terminal-job';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('job priority test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'priority-customer', tenantId, name: 'Priority Customer', phone: '8435550199', location: '1 Dispatch Way' }], jobs: [{ id: jobId, tenantId, customerId: 'priority-customer', customer: 'Priority Customer', service: 'Emergency plumbing', status: 'Confirmed', priority: 'Normal', time: 'Tomorrow 9:00 AM' }, { id: terminalJobId, tenantId, customerId: 'priority-customer', customer: 'Priority Customer', service: 'Completed service', status: 'Completed', priority: 'Normal', time: 'Yesterday' }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'job-priority-retry-1' };
  const first = await post(`/api/jobs/${jobId}/priority`, { priority: 'High' }, headers);
  const duplicate = await post(`/api/jobs/${jobId}/priority`, { priority: 'High' }, headers);
  const conflict = await post(`/api/jobs/${jobId}/priority`, { priority: 'Emergency' }, headers);
  const second = await post(`/api/jobs/${jobId}/priority`, { priority: 'Low' }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'job-priority-retry-2' });
  const terminal = await post(`/api/jobs/${terminalJobId}/priority`, { priority: 'High' }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'job-priority-terminal-1' });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const audits = (saved.auditEvents || []).filter((item) => item.action === 'job.priority.updated');
  const savedJob = saved.jobs.find((item) => item.id === jobId);
  if (!login.response.ok || first.response.status !== 200 || first.body.duplicate || first.body.priority !== 'High' || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || second.response.status !== 200 || second.body.priority !== 'Low' || terminal.response.status !== 409 || terminal.body.error !== 'terminal_job_priority_locked' || savedJob?.priority !== 'Low' || savedJob?.priorityIdempotencyKey !== 'job-priority-retry-2' || audits.length !== 2) throw new Error('job priority mutation did not deduplicate, reject key reuse, or preserve terminal safeguards');
  console.log('Northstar job priority idempotency test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
