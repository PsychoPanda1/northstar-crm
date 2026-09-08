import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7100 + Math.floor(Math.random() * 200);
const dataFile = join(tmpdir(), `northstar-bulk-route-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const date = '2026-09-07';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 600; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('bulk route optimization test server did not start within 30 seconds'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { jobs: [{ id: 'bulk-route-a', tenantId, customer: 'Bulk A', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', startsAt: '2026-09-07T13:00:00.000Z', endsAt: '2026-09-07T14:00:00.000Z', coordinates: { latitude: 32.8000, longitude: -79.9000 } }, { id: 'bulk-route-b', tenantId, customer: 'Bulk B', service: 'Plumbing', technician: 'Alex Rivera', status: 'Confirmed', startsAt: '2026-09-07T14:30:00.000Z', endsAt: '2026-09-07T15:30:00.000Z', coordinates: { latitude: 32.8100, longitude: -79.8800 } }, { id: 'bulk-conflict-a', tenantId, customer: 'Bulk Conflict A', service: 'Plumbing', technician: 'Marcus Thompson', status: 'Confirmed', startsAt: '2026-09-07T13:00:00.000Z', endsAt: '2026-09-07T14:00:00.000Z', coordinates: { latitude: 32.8000, longitude: -79.9000 } }, { id: 'bulk-conflict-b', tenantId, customer: 'Bulk Conflict B', service: 'Plumbing', technician: 'Marcus Thompson', status: 'Confirmed', startsAt: '2026-09-07T14:00:00.000Z', endsAt: '2026-09-07T15:00:00.000Z', coordinates: { latitude: 32.8000, longitude: -78.9000 } }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const blocked = await post('/api/dispatch/routes-optimize', { date, travelSpeedKph: 60 }, { ...auth, 'idempotency-key': 'bulk-route-blocked' });
  const beforeOverride = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].jobs;
  const override = await post('/api/dispatch/routes-optimize', { date, travelSpeedKph: 60, respectTimeWindows: false }, { ...auth, 'idempotency-key': 'bulk-route-override' });
  const duplicate = await post('/api/dispatch/routes-optimize', { date, travelSpeedKph: 60, respectTimeWindows: false }, { ...auth, 'idempotency-key': 'bulk-route-override' });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].jobs;
  if (!login.response.ok || blocked.response.status !== 409 || blocked.body.error !== 'route_time_window_conflict' || beforeOverride.some((job) => job.routeOrder) || override.response.status !== 200 || override.body.optimizedRoutes !== 2 || override.body.optimizedStops !== 4 || duplicate.response.status !== 200 || !duplicate.body.duplicate || saved.filter((job) => job.routeOptimization === 'coordinate_nearest_neighbor_2opt').length !== 4) throw new Error('bulk route optimization did not remain atomic, optimize all crews, or deduplicate safely');
  console.log('Northstar bulk route optimization test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
