import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4400;
const providerPort = 4401;
const base = `http://127.0.0.1:${port}`;
const providerUrl = `http://127.0.0.1:${providerPort}/setup`;
const secret = 'payment-setup-webhook-secret-32-characters';
const root = fileURLToPath(new URL('..', import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-payment-setup-'));
let providerRequest = null;
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  providerRequest = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  res.writeHead(201, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: 'provider-setup-1', url: `http://127.0.0.1:${providerPort}/hosted/provider-setup-1` }));
});
const server = spawn(process.execPath, [join(root, 'server.mjs')], { cwd: root, env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_SECRET: 'payment-setup-session-secret-32-character', NORTHSTAR_PAYMENT_WEBHOOK_SECRET: secret, NORTHSTAR_PAYMENT_SETUP_PROVIDER_URL: providerUrl, NORTHSTAR_ALLOW_DEMO_LOGIN: 'true' }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  await new Promise((resolve, reject) => provider.listen(providerPort, '127.0.0.1', (error) => error ? reject(error) : resolve()));
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const availability = await (await fetch(`${base}/api/public/availability?service=plumbing&days=7`)).json();
  const booking = await fetch(`${base}/api/public/bookings?service=plumbing`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'payment-setup-booking' }, body: JSON.stringify({ name: 'Setup Customer', phone: '8435550199', location: '1 Hosted Way', slotId: availability.slotOptions?.[0]?.id }) });
  const bookingBody = await booking.json();
  const token = bookingBody.customerPortalAccessToken;
  const setup = await fetch(`${base}/api/public/customer-portal/payment-method/setup?token=${encodeURIComponent(token)}`, { method: 'POST' });
  const setupBody = await setup.json();
  assert(setup.status === 201 && setupBody.url && setupBody.setupSessionId && providerRequest?.operation === 'payment_method_setup' && providerRequest?.setupSessionId === setupBody.setupSessionId && !JSON.stringify(setupBody).includes('providerPaymentMethodId'), 'hosted payment setup session did not stay provider-token-free');
  const event = { type: 'payment_method.attached', eventId: 'payment-method-attached-1', tenantId: 'clearwater-plumbing', setupSessionId: setupBody.setupSessionId, providerPaymentMethodId: 'pm_hosted_12345', methodType: 'Card', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2099 };
  const raw = JSON.stringify(event);
  const webhook = await fetch(`${base}/api/webhooks/payments`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-northstar-signature': createHmac('sha256', secret).update(raw).digest('hex') }, body: raw });
  const webhookBody = await webhook.json();
  const status = await (await fetch(`${base}/api/public/customer-portal/payment-method/setup-status?token=${encodeURIComponent(token)}&setupSessionId=${encodeURIComponent(setupBody.setupSessionId)}`)).json();
  const methods = await (await fetch(`${base}/api/public/customer-portal/payment-methods?token=${encodeURIComponent(token)}`)).json();
  assert(webhook.status === 201 && webhookBody.paymentMethod?.last4 === '4242' && !JSON.stringify(webhookBody).includes('providerPaymentMethodId') && status.setupSession?.status === 'Completed' && status.setupSession.paymentMethod?.last4 === '4242' && methods.items?.[0]?.isDefault, 'hosted payment setup webhook did not attach safe method metadata');
  const login = await fetch(`${base}/api/auth/demo-login?service=plumbing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const loginBody = await login.json();
  const health = await fetch(`${base}/api/integrations/payment-setup/health`, { headers: { authorization: `Bearer ${loginBody.token}` } });
  const healthBody = await health.json();
  assert(login.ok && health.status === 200 && healthBody.status === 'Payment provider needed' && !healthBody.checks?.paymentProvider && healthBody.checks?.setupProvider && healthBody.activeMethods === 1, 'payment setup readiness was not visible to the owner health console');
  console.log('Northstar hosted payment setup test passed');
} finally { server.kill(); await new Promise((resolve) => provider.close(resolve)); rmSync(tempDir, { recursive: true, force: true }); }
