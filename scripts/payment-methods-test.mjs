import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4398;
const base = `http://127.0.0.1:${port}`;
const root = fileURLToPath(new URL('..', import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-payment-methods-'));
const server = spawn(process.execPath, [join(root, 'server.mjs')], { cwd: root, env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_SECRET: 'payment-methods-test-secret-32-character', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true' }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const availability = await (await fetch(`${base}/api/public/availability?service=plumbing&days=7`)).json();
  const booking = await fetch(`${base}/api/public/bookings?service=plumbing`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'payment-method-booking' }, body: JSON.stringify({ name: 'Payment Method Customer', phone: '8435550188', location: '1 Vaulted Way', slotId: availability.slotOptions?.[0]?.id }) });
  const bookingBody = await booking.json();
  assert(booking.status === 201 && bookingBody.customerPortalAccessToken, 'seed booking failed');
  const token = bookingBody.customerPortalAccessToken;
  const save = await fetch(`${base}/api/public/customer-portal/payment-method?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ providerPaymentMethodId: 'pm_provider_token_12345', type: 'Card', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2099, isDefault: true }) });
  const saveBody = await save.json();
  const list = await (await fetch(`${base}/api/public/customer-portal/payment-methods?token=${encodeURIComponent(token)}`)).json();
  assert(save.status === 201 && saveBody.paymentMethod?.last4 === '4242' && !saveBody.paymentMethod.providerPaymentMethodId && list.items?.length === 1 && list.items[0].isDefault, 'tokenized payment method was not saved safely');
  const secondSave = await fetch(`${base}/api/public/customer-portal/payment-method?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ providerPaymentMethodId: 'pm_provider_token_67890', type: 'ACH', brand: 'Bank', last4: '6789', isDefault: false }) });
  const secondBody = await secondSave.json();
  const makeDefault = await fetch(`${base}/api/public/customer-portal/payment-method/default?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: secondBody.paymentMethod?.id }) });
  const defaultBody = await makeDefault.json();
  assert(secondSave.status === 201 && makeDefault.status === 200 && defaultBody.paymentMethod?.id === secondBody.paymentMethod?.id && defaultBody.paymentMethod?.isDefault && defaultBody.items?.filter((item) => item.isDefault).length === 1, 'customer could not switch the recurring default payment method safely');
  const ownerLogin = await fetch(`${base}/api/auth/demo-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  const ownerLoginBody = await ownerLogin.json();
  const ownerHeaders = { authorization: `Bearer ${ownerLoginBody.token}` };
  const customers = await (await fetch(`${base}/api/customers`, { headers: ownerHeaders })).json();
  const customer = customers.items?.find((item) => item.name === 'Payment Method Customer');
  const ownerList = await fetch(`${base}/api/payment-methods?customerId=${encodeURIComponent(customer?.id || '')}`, { headers: ownerHeaders });
  const ownerDefault = await fetch(`${base}/api/customers/${encodeURIComponent(customer?.id || '')}/payment-methods/${encodeURIComponent(secondBody.paymentMethod?.id || '')}/default`, { method: 'POST', headers: ownerHeaders });
  const ownerRemove = await fetch(`${base}/api/customers/${encodeURIComponent(customer?.id || '')}/payment-methods?id=${encodeURIComponent(secondBody.paymentMethod?.id || '')}`, { method: 'DELETE', headers: ownerHeaders });
  assert(ownerLogin.ok && customer?.id && ownerList.status === 200 && ownerDefault.status === 200 && ownerRemove.status === 200, 'owner customer profile payment-method controls were not tenant-safe');
  const rawCard = await fetch(`${base}/api/public/customer-portal/payment-method?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ providerPaymentMethodId: '4242424242424242', type: 'Card', last4: '4242' }) });
  assert(rawCard.status === 422, 'raw card number was accepted');
  const removed = await fetch(`${base}/api/public/customer-portal/payment-method?token=${encodeURIComponent(token)}&id=${encodeURIComponent(saveBody.paymentMethod.id)}`, { method: 'DELETE' });
  assert(removed.status === 200 && removed.json, 'payment method removal failed');
  console.log('Northstar tokenized payment methods test passed');
} finally { server.kill(); rmSync(tempDir, { recursive: true, force: true }); }
