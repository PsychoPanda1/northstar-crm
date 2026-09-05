import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4500 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-recovery-${process.pid}-${Date.now()}.json`);
const backupFile = `${dataFile}.backup`;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_BACKUP_FILE: backupFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
let child;
const start = () => { child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); };
const stop = () => { if (child && !child.killed) child.kill(); child = null; };
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('recovery test server did not start'); };
const jsonOptions = (body, token, key) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  start();
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', jsonOptions({ service: 'plumbing' }));
  if (!login.response.ok) throw new Error('recovery test login failed');
  const token = login.body.token;
  const first = await request('/api/customers', jsonOptions({ name: 'Recovered Customer', phone: '843-555-0141' }, token, 'recovery-customer-1'));
  const second = await request('/api/customers', jsonOptions({ name: 'Backup Trigger Customer', phone: '843-555-0142' }, token, 'recovery-customer-2'));
  if (first.response.status !== 201 || second.response.status !== 201 || !existsSync(backupFile)) throw new Error('backup snapshot was not created before the second write');
  stop();
  writeFileSync(dataFile, '{ malformed primary snapshot');
  start();
  await waitForServer();
  const recoveredLogin = await request('/api/auth/demo-login?service=plumbing', jsonOptions({ service: 'plumbing' }));
  const recovered = await request('/api/customers', { headers: { authorization: `Bearer ${recoveredLogin.body.token}` } });
  if (!recovered.response.ok || !recovered.body.items?.some((item) => item.name === 'Recovered Customer')) throw new Error('last-known-good backup was not recovered');
  console.log('Northstar persistence recovery test passed');
} finally {
  stop();
  for (const file of [dataFile, backupFile, `${dataFile}.tmp`, `${backupFile}.tmp`, `${dataFile}.sessions`, `${dataFile}.sessions.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
