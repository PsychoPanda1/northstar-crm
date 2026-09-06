import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5100 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-payment-refund-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const currentMessageSecret = 'northstar-message-current-secret-32-characters';
const previousMessageSecret = 'northstar-message-previous-secret-32-characters';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_MESSAGE_WEBHOOK_SECRET: currentMessageSecret, NORTHSTAR_MESSAGE_WEBHOOK_SECRET_PREVIOUS: previousMessageSecret };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('payment refund test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'refund-customer', tenantId, name: 'Refund Customer', phone: '843-555-0101' }], invoices: [{ id: 'refund-invoice', tenantId, customerId: 'refund-customer', customer: 'Refund Customer', amount: 100, value: '$100.00', paidAmount: 100, balance: 0, status: 'Paid' }], payments: [{ id: 'refund-payment', tenantId, customerId: 'refund-customer', invoiceId: 'refund-invoice', customer: 'Refund Customer', amount: 100, method: 'Card', reference: 'provider-123', paidAt: new Date().toISOString() }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'refund-key-1' };
  const first = await post('/api/payments/refund-payment/refund', { amount: 25, reason: 'Customer overpayment' }, headers);
  const duplicate = await post('/api/payments/refund-payment/refund', { amount: 25, reason: 'Customer overpayment' }, headers);
  const second = await post('/api/payments/refund-payment/refund', { amount: 75, reason: 'Remaining balance reversal' }, { authorization: headers.authorization, 'idempotency-key': 'refund-key-2' });
  const rotatedWebhookPayload = JSON.stringify({ tenantId, eventId: 'rotation-event-1', from: '843-555-0199', channel: 'SMS', message: 'Rotation verification' });
  const rotatedWebhook = await post('/api/webhooks/messages/inbound', JSON.parse(rotatedWebhookPayload), { 'x-northstar-signature': createHmac('sha256', previousMessageSecret).update(rotatedWebhookPayload).digest('hex') });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const invoice = saved.invoices.find((item) => item.id === 'refund-invoice');
  if (!login.response.ok || first.response.status !== 201 || first.body.invoice?.status !== 'Partially paid' || first.body.invoice?.balance !== 25 || duplicate.response.status !== 200 || !duplicate.body.duplicate || second.response.status !== 201 || rotatedWebhook.response.status !== 201 || invoice.status !== 'Due' || invoice.paidAmount !== 0 || invoice.balance !== 100 || saved.payments.filter((item) => item.refundOf === 'refund-payment').length !== 2) throw new Error('payment refund lifecycle, idempotency, or webhook secret rotation failed');
  console.log('Northstar payment refund test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
