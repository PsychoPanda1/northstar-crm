import { existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sqlite = await import('node:sqlite').catch(() => null);
if (!sqlite) { console.log('Northstar SQLite storage test skipped: node:sqlite unavailable in this runtime'); process.exit(0); }
const root = fileURLToPath(new URL('../', import.meta.url));
const suffix = `${process.pid}-${Date.now()}`;
const sqliteFile = join(tmpdir(), `northstar-storage-${suffix}.sqlite`);
const dataFile = join(tmpdir(), `northstar-storage-${suffix}.json`);
const sessionFile = `${dataFile}.sessions`;
const port = 5700 + Math.floor(Math.random() * 100);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_SQLITE_FILE: sqliteFile, NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
let child;
const cleanup = async () => { if (child) { child.kill(); await new Promise((resolve) => { const timer = setTimeout(resolve, 500); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); if (child.exitCode === null && process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} await new Promise((resolve) => setTimeout(resolve, 150)); } } for (const file of [sqliteFile, dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) { try { unlinkSync(file); } catch {} } };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('SQLite storage test server did not start'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await post('/api/auth/demo-login', { service: 'default', role: 'owner' }); assert(login.response.ok, 'SQLite storage test login failed');
  const created = await post('/api/customers', { name: 'SQLite Durable Customer', phone: '843-555-0411', location: '4 Durable Lane' }, login.body.token); assert(created.response.status === 201, 'SQLite storage test record creation failed');
  child.kill(); child = null; await new Promise((resolve) => setTimeout(resolve, 150));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const loginAgain = await post('/api/auth/demo-login', { service: 'default', role: 'owner' }); assert(loginAgain.response.ok, 'SQLite storage test restart login failed');
  const records = await request('/api/customers?search=SQLite%20Durable', { headers: { authorization: `Bearer ${loginAgain.body.token}` } }); assert(records.response.ok && records.body.items?.some((item) => item.name === 'SQLite Durable Customer'), 'SQLite state did not survive restart');
  console.log('Northstar SQLite storage test passed');
} finally { await cleanup(); }
