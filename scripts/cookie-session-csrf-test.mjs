import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7600 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-cookie-csrf-${process.pid}-${Date.now()}.json`);
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
let child;
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('cookie session CSRF test server did not start'); };
const request = (path, options = {}) => fetch(`${base}${path}`, options);
try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'default', role: 'owner' }) });
  const cookie = String(login.headers.get('set-cookie') || '').split(';')[0];
  const blocked = await request('/api/customers', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Cross-site attempt' }) });
  const allowed = await request('/api/customers', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json', 'idempotency-key': 'cookie-csrf-safe-1' }, body: JSON.stringify({ name: 'Same-origin customer', phone: '843-555-0199', location: '1 Safe Lane' }) });
  if (!login.ok || blocked.status !== 403 || (await blocked.json()).error !== 'same_origin_required' || allowed.status !== 201) throw new Error('cookie-authenticated mutations did not enforce same-origin requests while allowing same-origin work');
  console.log('Northstar cookie session CSRF boundary passed');
} finally {
  child?.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
