import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9200 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-location-history-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('location history test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'location-customer', tenantId, name: 'Location Customer', phone: '843-555-0199', location: '1 Tracking Way' }], materials: [{ id: 'location-material', tenantId, name: 'Tracking valve', sku: 'TRACK-SKU', barcode: 'TRACK-BARCODE', unit: 'each', unitCost: 5, onHand: 4 }], jobs: [{ id: 'JOB-LOCATION-1', tenantId, customerId: 'location-customer', customer: 'Location Customer', service: 'Plumbing', technician: 'Alex Rivera', status: 'En route', time: 'Today 9:00 AM', location: '1 Tracking Way' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const link = await post('/api/jobs/JOB-LOCATION-1/technician-link', { technician: 'Alex Rivera' }, auth);
  const technicianUrl = link.body.url ? new URL(link.body.url, base) : null;
  const token = technicianUrl?.searchParams.get('token');
  const technicianJob = token ? await request('/api/public/technician-job?token=' + encodeURIComponent(token)) : { response: { ok: false }, body: {} };
  const first = token ? await post('/api/public/technician-job/location?token=' + encodeURIComponent(token), { latitude: 32.78, longitude: -79.93, accuracy: 12 }) : { response: { ok: false }, body: {} };
  const second = token ? await post('/api/public/technician-job/location?token=' + encodeURIComponent(token), { latitude: 32.79, longitude: -79.92, accuracy: 10 }) : { response: { ok: false }, body: {} };
  const history = await request('/api/jobs/JOB-LOCATION-1/location-history', { headers: auth });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || link.response.status !== 200 || technicianJob.response.status !== 200 || technicianJob.body.materials?.[0]?.sku !== 'TRACK-SKU' || technicianJob.body.materials?.[0]?.barcode !== 'TRACK-BARCODE' || first.response.status !== 200 || second.response.status !== 200 || history.response.status !== 200 || history.body.tracking?.status !== 'live' || history.body.pings?.length !== 2 || history.body.pings[1].latitude !== 32.79 || persisted.jobs[0].locationPings?.length !== 2) throw new Error('bounded location history or safe material identifier workflow failed');
  console.log('Northstar location history test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
