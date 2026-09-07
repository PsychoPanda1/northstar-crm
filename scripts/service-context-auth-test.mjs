import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7300 + Math.floor(Math.random() * 200);
const dataFile = join(tmpdir(), `northstar-service-context-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ alpha: 'clearwater-plumbing', beta: 'clearwater-plumbing' }) };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('service context auth test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=alpha', { service: 'alpha', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const sameService = await request('/api/session?service=alpha', { headers: auth });
  const otherService = await request('/api/session?service=beta', { headers: auth });
  const otherTenant = await request('/api/session?service=plumbing', { headers: auth });
  const refreshed = await post('/api/auth/refresh?service=alpha', {}, auth);
  const refreshedOther = await post('/api/auth/refresh?service=beta', {}, { authorization: `Bearer ${refreshed.body.token}` });
  if (!login.response.ok || login.body.service !== 'alpha' || sameService.response.status !== 200 || sameService.body.service !== 'alpha' || otherService.response.status !== 403 || otherService.body.error !== 'service_context_mismatch' || otherTenant.response.status !== 403 || refreshed.response.status !== 200 || refreshed.body.service !== 'alpha' || refreshedOther.response.status !== 403 || refreshedOther.body.error !== 'service_context_mismatch') throw new Error('authenticated service context was not preserved or isolated across landing pages');
  console.log('Northstar service context auth test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
