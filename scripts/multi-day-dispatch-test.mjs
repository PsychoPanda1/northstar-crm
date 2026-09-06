import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9800 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-multi-day-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('multi-day dispatch test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { jobs: [{ id: 'JOB-MULTI-DAY', tenantId, customer: 'Multi-day Customer', service: 'Installation project', technician: 'Alex Rivera', status: 'Confirmed', time: 'Sep 7–9', location: '1 Project Way', startsAt: '2026-09-07T13:00:00.000Z', endsAt: '2026-09-09T14:00:00.000Z' }, { id: 'JOB-SINGLE-DAY', tenantId, customer: 'Single-day Customer', service: 'Inspection', technician: 'Alex Rivera', status: 'Confirmed', time: 'Sep 8', location: '2 Project Way', startsAt: '2026-09-08T15:00:00.000Z', endsAt: '2026-09-08T16:00:00.000Z' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const middle = await request('/api/dispatch?date=2026-09-08', { headers });
  const last = await request('/api/dispatch?date=2026-09-09', { headers });
  const summary = await request('/api/dispatch/route-summary?date=2026-09-08', { headers });
  const ids = middle.body.items?.map((item) => item.id) || [];
  if (!login.response.ok || middle.response.status !== 200 || last.response.status !== 200 || summary.response.status !== 200 || summary.body.totalStops !== 2 || !ids.includes('JOB-MULTI-DAY') || !ids.includes('JOB-SINGLE-DAY') || !last.body.items?.some((item) => item.id === 'JOB-MULTI-DAY')) throw new Error('multi-day jobs were not projected across every covered dispatch date');
  console.log('Northstar multi-day dispatch test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
