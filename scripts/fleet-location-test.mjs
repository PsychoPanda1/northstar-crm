import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6800 + Math.floor(Math.random() * 400);
const dataFile = join(tmpdir(), `northstar-fleet-location-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const vehicleId = 'fleet-van-1';
const secret = 'fleet-location-secret-for-test-32';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_FLEET_WEBHOOK_SECRET: secret };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const signedPost = (path, body, signatureSecret = secret) => { const raw = JSON.stringify(body); return post(path, body, { 'x-northstar-signature': createHmac('sha256', signatureSecret).update(raw).digest('hex') }); };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('fleet location test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { vehicles: [{ id: vehicleId, tenantId, name: 'Van 1', makeModel: 'Ford Transit', licensePlate: 'NS-001', status: 'Active' }], jobs: [{ id: 'fleet-job-1', tenantId, vehicleId, customer: 'Fleet Customer', service: 'Emergency plumbing', status: 'En route', technician: 'Alex Rivera' }], fleetLocationEvents: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const location = { eventId: 'fleet-event-1', tenantId, vehicleId, latitude: 32.7765, longitude: -79.9311, accuracy: 8, speed: 32.4, heading: 180, recordedAt: '2020-01-02T14:00:00.000Z', provider: 'test-gps' };
  const received = await signedPost('/api/webhooks/fleet/location', location);
  const duplicate = await signedPost('/api/webhooks/fleet/location', location);
  const delayed = await signedPost('/api/webhooks/fleet/location', { ...location, eventId: 'fleet-event-0', latitude: 31.5, recordedAt: '2019-12-31T14:00:00.000Z' });
  const conflict = await signedPost('/api/webhooks/fleet/location', { ...location, latitude: 33 });
  const maintenance = await request(`/api/vehicles/${vehicleId}`, { method: 'PATCH', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'fleet-maintenance-1' }, body: JSON.stringify({ nextServiceDue: '2020-01-01', odometer: 48200 }) });
  const locations = await request('/api/vehicles/locations', { headers: { authorization: `Bearer ${login.body.token}` } });
  const notifications = await request('/api/notifications', { headers: { authorization: `Bearer ${login.body.token}` } });
  const staleNotification = notifications.body.items?.find((entry) => entry.vehicleId === vehicleId);
  const maintenanceNotification = notifications.body.items?.find((entry) => entry.title === 'Fleet maintenance overdue');
  const marked = staleNotification ? await request(`/api/notifications/${encodeURIComponent(staleNotification.id)}/read`, { method: 'POST', headers: { authorization: `Bearer ${login.body.token}` } }) : { response: { status: 0 }, body: {} };
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const item = locations.body.items?.find((entry) => entry.vehicleId === vehicleId);
  if (!login.response.ok || received.response.status !== 200 || received.body.applied !== true || duplicate.response.status !== 200 || !duplicate.body.duplicate || delayed.response.status !== 200 || delayed.body.applied !== false || conflict.response.status !== 409 || maintenance.response.status !== 200 || maintenance.body.maintenanceStatus !== 'Overdue' || maintenance.body.odometer !== 48200 || locations.response.status !== 200 || item?.location?.latitude !== 32.7765 || item?.location?.speed !== 32.4 || item?.status !== 'stale' || notifications.response.status !== 200 || staleNotification?.title !== 'Fleet location stale' || maintenanceNotification?.vehicleId !== vehicleId || marked.response.status !== 200 || saved.fleetLocationEvents?.length !== 2 || saved.vehicles?.[0]?.locationPings?.length !== 1 || !saved.auditEvents?.some((entry) => entry.action === 'vehicle.location.stale_event_ignored') || !saved.auditEvents?.some((entry) => entry.action === 'vehicle.maintenance.updated')) throw new Error('fleet telemetry or maintenance did not validate, deduplicate, retain, order, or notify safely');
  console.log('Northstar fleet location test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
