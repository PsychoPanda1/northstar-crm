import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 20000 + Math.floor(Math.random() * 1000);
const dataFile = join(tmpdir(), `northstar-lead-stages-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 400; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead stage test server did not start'); };
const postJson = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('lead stage test login failed');
  const token = login.body.token;
  const headers = { authorization: `Bearer ${token}` };
  const initial = await request('/api/settings/lead-stages', { headers });
  const stages = ['New', 'Contacted', 'Site visit', 'Estimate sent', 'Won', 'Lost'];
  const updated = await request('/api/settings/lead-stages', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'lead-stage-config-1' }, body: JSON.stringify({ stages }) });
  const duplicate = await request('/api/settings/lead-stages', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'lead-stage-config-1' }, body: JSON.stringify({ stages }) });
  const invalid = await request('/api/settings/lead-stages', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ stages: ['New', 'Converted'] }) });
  const filtered = await request('/api/leads?status=Site%20visit', { headers });
  if (initial.response.status !== 200 || !Array.isArray(initial.body.stages) || updated.response.status !== 200 || updated.body.stages.join('|') !== `${stages.join('|')}|Converted` || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || invalid.response.status !== 422 || filtered.response.status !== 200) throw new Error('lead stage configuration contract failed');
  console.log('Northstar lead stage configuration test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
