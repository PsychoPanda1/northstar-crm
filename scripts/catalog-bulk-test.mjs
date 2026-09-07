import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4700 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-catalog-bulk-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('catalog bulk test server did not start'); };
const postJson = (path, body, token, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing' });
  if (!login.response.ok) throw new Error('catalog bulk test login failed');
  const token = login.body.token;
  const items = [{ name: 'Bulk drain cleaning', description: 'Clear and inspect residential drains', priceFrom: '$249', category: 'Repair', durationMinutes: 90, taxable: true, checklist: ['Protect work area'] }, { name: 'Bulk faucet repair', description: 'Diagnose and repair a leaking faucet', priceFrom: '$179', category: 'Repair', durationMinutes: 60, taxable: true }];
  const first = await postJson('/api/catalog/import', { items }, token, 'catalog-bulk-test');
  const replay = await postJson('/api/catalog/import', { items }, token, 'catalog-bulk-test');
  const conflict = await postJson('/api/catalog/import', { items: [{ ...items[0], priceFrom: '$299' }] }, token, 'catalog-bulk-test');
  const invalid = await postJson('/api/catalog/import', { items: [{ ...items[0], durationMinutes: 5 }] }, token, 'catalog-bulk-invalid');
  if (first.response.status !== 201 || first.body.created !== 2 || replay.response.status !== 200 || replay.body.duplicate !== true || conflict.response.status !== 409 || invalid.response.status !== 422) throw new Error('bulk catalog import contract failed');
  console.log('Northstar bulk catalog import test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
