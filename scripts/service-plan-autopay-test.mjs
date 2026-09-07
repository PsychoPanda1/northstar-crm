import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4750 + Math.floor(Math.random() * 100);
const tenantId = 'clearwater-plumbing';
const customerId = 'autopay-customer';
const dataFile = join(tmpdir(), `northstar-plan-autopay-${process.pid}-${Date.now()}.json`);
const period = '2099-07';
writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: customerId, tenantId, name: 'Autopay Customer', phone: '843-555-0187', location: '1 Recurring Way', status: 'Active' }], paymentMethods: [{ id: 'pm-local', tenantId, customerId, type: 'Card', brand: 'Visa', last4: '4242', provider: 'test-provider', providerPaymentMethodId: 'pm_provider_token_autopay', status: 'Active', isDefault: true, createdAt: new Date().toISOString() }], plans: [{ id: 'autopay-plan', tenantId, customerId, customer: 'Autopay Customer', service: 'Priority maintenance', amount: 149, status: 'Active', billingSchedule: 'Monthly', renewalAt: '2099-01-01T12:00:00.000Z', autoPay: true }], invoices: [], paymentIntents: [] } }));
const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('service-plan autopay server did not start'); }
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const billed = await request('/api/plans/billing-cycle', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'autopay-cycle-1' }, body: JSON.stringify({ period, due: 'Due on receipt' }) });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const invoice = persisted.invoices?.find((item) => item.planId === 'autopay-plan');
  const intent = persisted.paymentIntents?.find((item) => item.invoiceId === invoice?.id);
  assert(login.response.ok && billed.response.ok && invoice?.paymentIntentId === intent?.id && intent?.source === 'service_plan_autopay' && intent?.providerPaymentMethodId === 'pm_provider_token_autopay' && intent?.method === 'Card' && intent?.status === 'Pending provider', 'recurring plan autopay did not create a provider-pending intent from the customer default method');
  console.log('Northstar service-plan autopay test passed');
} finally { child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
