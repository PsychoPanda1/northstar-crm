import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4600 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-catalog-idempotency-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('catalog idempotency test server did not start'); };
const postJson = (path, body, token, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing' });
  if (!login.response.ok) throw new Error('catalog idempotency test login failed');
  const token = login.body.token;
  const body = { name: 'Idempotent catalog item', description: 'A service item used for retry verification', priceFrom: '$199', category: 'Testing', durationMinutes: 60, taxable: true };
  const first = await postJson('/api/catalog', body, token, 'catalog-idempotency-test');
  const conflict = await postJson('/api/catalog', { ...body, priceFrom: '$299' }, token, 'catalog-idempotency-test');
  if (first.response.status !== 201 || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused') throw new Error('catalog retries were not payload-bound');
  console.log('Northstar catalog idempotency test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
