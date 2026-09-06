import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4395;
const base = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-portal-booking-'));
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_SECRET: 'customer-portal-booking-test-secret-32', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_CATALOG_JSON: JSON.stringify([{ id: 'CAT-PORTAL', tenantId: 'clearwater-plumbing', name: 'Drain cleaning', description: 'Drain cleaning service', priceFrom: '$149', durationMinutes: 90 }]) }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const availability = await (await fetch(`${base}/api/public/availability?service=plumbing&days=7`)).json();
  const firstSlot = availability.slotOptions?.[0];
  assert(firstSlot, 'booking slot unavailable');
  const booking = await fetch(`${base}/api/public/bookings?service=plumbing`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'portal-booking-seed' }, body: JSON.stringify({ name: 'Portal Customer', phone: '8435550199', location: '1 Portal Way', slotId: firstSlot.id }) });
  const bookingBody = await booking.json();
  assert(booking.status === 201 && bookingBody.customerPortalAccessToken, 'seed booking failed');
  const nextAvailability = await (await fetch(`${base}/api/public/availability?service=plumbing&days=7`)).json();
  const nextSlot = nextAvailability.slotOptions?.[0];
  assert(nextSlot, 'second booking slot unavailable');
  const token = bookingBody.customerPortalAccessToken;
  const portal = await (await fetch(`${base}/api/public/customer-portal?token=${encodeURIComponent(token)}`)).json();
  assert(portal.availableBookingSlots?.length, 'customer portal booking slots unavailable');
  const book = () => fetch(`${base}/api/public/customer-portal/book?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'portal-booking-repeatable' }, body: JSON.stringify({ service: 'Drain cleaning', slotId: nextSlot.id, intakeAnswers: { issue_type: 'Clog or drain', urgency: 'This week' } }) });
  const response = await book();
  const body = await response.json();
  const duplicate = await book();
  const duplicateBody = await duplicate.json();
  const refreshedPortal = await (await fetch(`${base}/api/public/customer-portal?token=${encodeURIComponent(token)}`)).json();
  assert(response.status === 201 && body.booked && body.notification?.template === 'confirmation' && duplicate.status === 200 && duplicateBody.duplicate && duplicateBody.id === body.id && duplicateBody.notification?.jobId === body.id && refreshedPortal.jobs?.some((job) => job.id === body.id && job.service === 'Drain cleaning'), 'customer portal booking idempotency or confirmation handoff failed');
  console.log('Northstar customer portal booking test passed');
} finally {
  server.kill();
  rmSync(tempDir, { recursive: true, force: true });
}
