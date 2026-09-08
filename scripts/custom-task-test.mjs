import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5100 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-custom-task-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('task login failed');
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'custom-task-once' };
  const created = await post('/api/tasks', { title: 'Call customer back', detail: 'Confirm the morning arrival window.', dueAt: '2026-09-15T12:00:00.000Z' }, headers);
  const duplicate = await post('/api/tasks', { title: 'Call customer back', detail: 'Confirm the morning arrival window.', dueAt: '2026-09-15T12:00:00.000Z' }, headers);
  const listed = await request('/api/tasks', { headers: { authorization: `Bearer ${login.body.token}` } });
  const completionHeaders = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'custom-task-complete-once' };
  const completed = await request(`/api/tasks/${created.body.task.id}`, { method: 'PATCH', headers: completionHeaders, body: JSON.stringify({ status: 'Completed' }) });
  const completedDuplicate = await request(`/api/tasks/${created.body.task.id}`, { method: 'PATCH', headers: completionHeaders, body: JSON.stringify({ status: 'Completed' }) });
  const completedConflict = await request(`/api/tasks/${created.body.task.id}`, { method: 'PATCH', headers: completionHeaders, body: JSON.stringify({ status: 'Open' }) });
  const after = await request('/api/tasks', { headers: { authorization: `Bearer ${login.body.token}` } });
  const history = await request('/api/tasks?includeCompleted=true', { headers: { authorization: `Bearer ${login.body.token}` } });
  const technicianLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'technician' });
  const technicianTasks = await request('/api/tasks', { headers: { authorization: `Bearer ${technicianLogin.body.token}` } });
  const customers = await request('/api/customers', { headers: { authorization: `Bearer ${login.body.token}` } });
  const jobCreated = await post('/api/jobs', { customerId: customers.body.items?.[0]?.id, service: 'Configuration test', time: '2099-09-15 09:00 AM' }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'job-config-create-once' });
  const job = jobCreated.body;
  const configHeaders = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'job-config-once' };
  const checklist = await request(`/api/jobs/${job.id}/checklist`, { method: 'POST', headers: configHeaders, body: JSON.stringify({ items: ['Protect work area', 'Test completed repair'] }) });
  const checklistDuplicate = await request(`/api/jobs/${job.id}/checklist`, { method: 'POST', headers: configHeaders, body: JSON.stringify({ items: ['Protect work area', 'Test completed repair'] }) });
  const checklistConflict = await request(`/api/jobs/${job.id}/checklist`, { method: 'POST', headers: configHeaders, body: JSON.stringify({ items: ['Different step'] }) });
  const formHeaders = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'job-forms-once' };
  const forms = await request(`/api/jobs/${job.id}/form-requirements`, { method: 'POST', headers: formHeaders, body: JSON.stringify({ formNames: ['Safety inspection'] }) });
  const formsDuplicate = await request(`/api/jobs/${job.id}/form-requirements`, { method: 'POST', headers: formHeaders, body: JSON.stringify({ formNames: ['Safety inspection'] }) });
  const formsConflict = await request(`/api/jobs/${job.id}/form-requirements`, { method: 'POST', headers: formHeaders, body: JSON.stringify({ formNames: ['Different inspection'] }) });
  if (created.response.status !== 201 || duplicate.response.status !== 200 || !duplicate.body.duplicate || !listed.body.items.some((item) => item.id === created.body.task.id) || completed.response.status !== 200 || completed.body.task.status !== 'Completed' || completedDuplicate.response.status !== 200 || !completedDuplicate.body.duplicate || completedConflict.response.status !== 409 || after.body.items.some((item) => item.id === created.body.task.id) || !history.body.items.some((item) => item.id === created.body.task.id && item.status === 'Completed') || technicianTasks.response.status !== 403 || jobCreated.response.status !== 201 || checklist.response.status !== 200 || checklistDuplicate.response.status !== 200 || !checklistDuplicate.body.duplicate || checklistConflict.response.status !== 409 || forms.response.status !== 200 || formsDuplicate.response.status !== 200 || !formsDuplicate.body.duplicate || formsConflict.response.status !== 409) throw new Error('custom task or job configuration lifecycle failed');
  console.log('Northstar custom task checks passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
