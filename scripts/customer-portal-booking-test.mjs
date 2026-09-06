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
  const locationResponse = await fetch(`${base}/api/public/customer-portal/location?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'portal-location-create' }, body: JSON.stringify({ mode: 'additional', label: 'Rental property', address: '22 Portal Lane' }) });
  const locationBody = await locationResponse.json();
  assert(locationResponse.status === 200 && locationBody.mode === 'additional' && locationBody.address === '22 Portal Lane', 'customer portal secondary location failed');
  const updatedPortal = await (await fetch(`${base}/api/public/customer-portal?token=${encodeURIComponent(token)}`)).json();
  const requestedLocationId = updatedPortal.locations?.find((item) => item.address === '22 Portal Lane')?.id;
  assert(requestedLocationId, 'customer portal secondary location was not persisted');
  const book = () => fetch(`${base}/api/public/customer-portal/book?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'portal-booking-repeatable' }, body: JSON.stringify({ service: 'Drain cleaning', slotId: nextSlot.id, locationId: requestedLocationId, intakeAnswers: { issue_type: 'Clog or drain', urgency: 'This week' } }) });
  const response = await book();
  const body = await response.json();
  const duplicate = await book();
  const duplicateBody = await duplicate.json();
  const refreshedPortal = await (await fetch(`${base}/api/public/customer-portal?token=${encodeURIComponent(token)}`)).json();
  const messageRequest = () => fetch(`${base}/api/public/customer-portal/message?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'portal-message-repeatable' }, body: JSON.stringify({ channel: 'SMS', message: 'Can you confirm the arrival window?' }) });
  const messageResponse = await messageRequest();
  const messageBody = await messageResponse.json();
  const duplicateMessage = await messageRequest();
  const duplicateMessageBody = await duplicateMessage.json();
  const messagePortal = await (await fetch(`${base}/api/public/customer-portal?token=${encodeURIComponent(token)}`)).json();
  assert(response.status === 201 && body.booked && body.locationId === requestedLocationId && body.notification?.template === 'confirmation' && duplicate.status === 200 && duplicateBody.duplicate && duplicateBody.id === body.id && duplicateBody.locationId === requestedLocationId && duplicateBody.notification?.jobId === body.id && refreshedPortal.jobs?.some((job) => job.id === body.id && job.service === 'Drain cleaning' && job.location === '22 Portal Lane') && messageResponse.status === 201 && messageBody.message?.direction === 'inbound' && duplicateMessage.status === 200 && duplicateMessageBody.duplicate && duplicateMessageBody.message?.id === messageBody.message.id && messagePortal.messages?.some((item) => item.id === messageBody.message.id), 'customer portal booking or message workflow failed');
  console.log('Northstar customer portal booking test passed');
} finally {
  server.kill();
  rmSync(tempDir, { recursive: true, force: true });
}
