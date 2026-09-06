import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4850 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-auto-assignment-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'auto-plumbing', businessName: 'Auto Plumbing', serviceLabel: 'Plumbing', timeZone: 'America/New_York', autoAssignOnlineBookings: true }]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ plumbing: 'auto-plumbing' }) };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('auto-assignment server did not start'); };

try {
  await waitForServer();
  const availability = await request('/api/public/availability?service=plumbing&days=14');
  const slot = availability.body.slotOptions?.[0];
  const booking = await request('/api/public/bookings?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json', origin: `${base}` }, body: JSON.stringify({ service: 'plumbing', name: 'Auto Assignment Customer', phone: '843-555-0188', location: '10 Auto Way', requestedService: 'Pipe repair', slotId: slot?.id, idempotencyKey: 'auto-assignment-booking' }) });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['auto-plumbing'];
  const savedJob = persisted?.jobs?.find((item) => item.id === booking.body.id);
  const confirmations = persisted?.messages?.filter((item) => item.jobId === booking.body.id && item.template === 'confirmation') || [];
  if (!availability.response.ok || !slot || booking.response.status !== 201 || savedJob?.technician !== 'Alex Rivera' || savedJob?.status !== 'Confirmed' || savedJob?.assignmentSource !== 'online_booking_auto_assign' || confirmations.length !== 1 || confirmations[0].status !== 'Queued (provider pending)') throw new Error('configured online booking was not safely auto-assigned and notified');
  console.log('Northstar online auto-assignment test passed');
} finally {
  child.kill();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
