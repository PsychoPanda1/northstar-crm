import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5000 + Math.floor(Math.random() * 100);
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
  const completed = await request(`/api/tasks/${created.body.task.id}`, { method: 'PATCH', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'Completed' }) });
  const after = await request('/api/tasks', { headers: { authorization: `Bearer ${login.body.token}` } });
  if (created.response.status !== 201 || duplicate.response.status !== 200 || !duplicate.body.duplicate || !listed.body.items.some((item) => item.id === created.body.task.id) || completed.response.status !== 200 || completed.body.task.status !== 'Completed' || after.body.items.some((item) => item.id === created.body.task.id)) throw new Error('custom task lifecycle failed');
  console.log('Northstar custom task checks passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
