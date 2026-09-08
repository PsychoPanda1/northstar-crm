import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7000 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-session-rotation-${process.pid}-${Date.now()}.json`);
const base = `http://127.0.0.1:${port}`;
const common = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('session rotation test server did not start'); };
const stop = () => { if (child && !child.killed) child.kill(); child = null; };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...common, NORTHSTAR_SESSION_SECRET: 'old-session-secret-for-rotation-test' }, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  if (!login.response.ok || !login.body.token) throw new Error('could not issue pre-rotation token');
  const token = login.body.token;
  stop();
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...common, NORTHSTAR_SESSION_SECRET: 'new-session-secret-for-rotation-test', NORTHSTAR_SESSION_SECRET_PREVIOUS: 'old-session-secret-for-rotation-test' }, stdio: 'ignore' });
  await waitForServer();
  const session = await request('/api/session', { headers: { authorization: `Bearer ${token}` } });
  if (session.response.status !== 200 || session.body.owner?.role !== 'owner') throw new Error('previous session secret was not accepted during rotation');
  console.log('Northstar session secret rotation test passed');
} finally {
  stop();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
