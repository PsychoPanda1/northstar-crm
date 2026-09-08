import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4890 + Math.floor(Math.random() * 80);
const dataFile = join(tmpdir(), `northstar-message-delivery-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
const secret = 'current-message-webhook-secret-32-characters';
const previousSecret = 'previous-message-webhook-secret-32-chars';
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'delivery_customer', tenantId: 'clearwater-plumbing', name: 'Delivery Customer', phone: '843-555-0123' }], messages: [{ id: 'delivery_sent', tenantId: 'clearwater-plumbing', customerId: 'delivery_customer', customer: 'Delivery Customer', channel: 'SMS', direction: 'outbound', message: 'Your technician is on the way.', status: 'Queued (provider pending)' }, { id: 'delivery_failed', tenantId: 'clearwater-plumbing', customerId: 'delivery_customer', customer: 'Delivery Customer', channel: 'Email', direction: 'outbound', message: 'Your invoice is ready.', status: 'Queued (provider pending)' }] } }));
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_MESSAGE_WEBHOOK_SECRET: secret, NORTHSTAR_MESSAGE_WEBHOOK_SECRET_PREVIOUS: previousSecret };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('message delivery webhook server did not start'); };
const signed = async (payload, signingSecret = secret) => { const raw = JSON.stringify(payload); return request('/api/webhooks/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-northstar-signature': createHmac('sha256', signingSecret).update(raw).digest('hex') }, body: raw }); };

try {
  await waitForServer();
  const delivered = await signed({ eventId: 'delivery-event-1', tenantId: 'clearwater-plumbing', messageId: 'delivery_sent', status: 'delivered', providerReference: 'sms-provider-1' }, previousSecret);
  const duplicate = await signed({ eventId: 'delivery-event-1', tenantId: 'clearwater-plumbing', messageId: 'delivery_sent', status: 'delivered', providerReference: 'sms-provider-1' }, previousSecret);
  const conflict = await signed({ eventId: 'delivery-event-1', tenantId: 'clearwater-plumbing', messageId: 'delivery_sent', status: 'failed' }, previousSecret);
  const bounced = await signed({ eventId: 'delivery-event-2', tenantId: 'clearwater-plumbing', messageId: 'delivery_failed', status: 'bounced', reason: 'mailbox unavailable', code: '550' });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'].messages;
  const sent = saved.find((item) => item.id === 'delivery_sent');
  const failed = saved.find((item) => item.id === 'delivery_failed');
  if (delivered.response.status !== 200 || delivered.body.message?.status !== 'Sent' || delivered.body.message?.providerDeliveryStatus !== 'delivered' || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflict.response.status !== 409 || conflict.body.error !== 'webhook_event_reused' || bounced.response.status !== 200 || bounced.body.message?.status !== 'Failed' || bounced.body.message?.providerDeliveryStatus !== 'bounced' || failed.providerError !== 'mailbox unavailable' || sent.providerReference !== 'sms-provider-1') throw new Error('message delivery webhook status, rotation, or replay contract failed');
  console.log('Northstar message delivery webhook test passed');
} finally {
  child.kill();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
