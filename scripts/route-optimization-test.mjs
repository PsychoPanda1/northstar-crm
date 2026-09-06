import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6400 + Math.floor(Math.random() * 1000);
const dataFile = join(tmpdir(), `northstar-route-optimization-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const date = '2026-09-07';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('route optimization test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { jobs: [{ id: 'route-job-a', tenantId, customer: 'Route A', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', time: '9:00 AM', startsAt: '2026-09-07T13:00:00.000Z', endsAt: '2026-09-07T14:00:00.000Z', coordinates: { latitude: 32.8000, longitude: -79.9000 } }, { id: 'route-job-b', tenantId, customer: 'Route B', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', time: '10:00 AM', startsAt: '2026-09-07T14:00:00.000Z', endsAt: '2026-09-07T15:00:00.000Z', coordinates: { latitude: 32.8100, longitude: -79.8800 } }, { id: 'route-job-c', tenantId, customer: 'Route C', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', time: '11:00 AM', startsAt: '2026-09-07T15:00:00.000Z', endsAt: '2026-09-07T16:00:00.000Z', coordinates: { latitude: 32.8200, longitude: -79.9200 } }, { id: 'route-job-unmapped', tenantId, customer: 'No Map', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', time: '12:00 PM', startsAt: '2026-09-07T16:00:00.000Z', endsAt: '2026-09-07T17:00:00.000Z' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'route-optimize-1' };
  const optimized = await post('/api/dispatch/route-optimize', { date, technician: 'Alex Rivera', startLatitude: 32.8000, startLongitude: -79.9000 }, headers);
  const duplicate = await post('/api/dispatch/route-optimize', { date, technician: 'Alex Rivera', startLatitude: 32.8000, startLongitude: -79.9000 }, headers);
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const mapped = saved.jobs.filter((item) => item.routeOptimization === 'coordinate_nearest_neighbor');
  if (!login.response.ok || optimized.response.status !== 200 || optimized.body.optimizedStops !== 3 || optimized.body.skippedStops !== 1 || duplicate.response.status !== 200 || !duplicate.body.duplicate || mapped.length !== 3 || mapped.some((item) => !Number.isInteger(item.routeOrder))) throw new Error('route optimization did not safely order mapped stops or deduplicate');
  console.log('Northstar route optimization test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
