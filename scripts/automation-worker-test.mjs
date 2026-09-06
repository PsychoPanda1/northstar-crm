import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4600 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-automation-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'automation_customer', tenantId: 'clearwater-plumbing', name: 'Automation Customer', phone: '843-555-0199', location: '1 Automation Way', status: 'Active' }], jobs: [{ id: 'automation_job', tenantId: 'clearwater-plumbing', customerId: 'automation_customer', customer: 'Automation Customer', service: 'Plumbing', status: 'Confirmed', time: 'Tomorrow 9:00 AM', startsAt, endsAt, technician: 'Alex Rivera' }], plans: [{ id: 'automation_plan', tenantId: 'clearwater-plumbing', customerId: 'automation_customer', customer: 'Automation Customer', service: 'Annual plumbing maintenance', amount: 240, status: 'Active' }], invoices: [{ id: 'automation_invoice', tenantId: 'clearwater-plumbing', customerId: 'automation_customer', customer: 'Automation Customer', amount: 125, value: '$125.00', balance: 125, paidAmount: 0, status: 'Due' }], paymentIntents: [{ id: 'automation_intent', tenantId: 'clearwater-plumbing', customerId: 'automation_customer', invoiceId: 'automation_invoice', customer: 'Automation Customer', amount: 125, method: 'Card', status: 'Pending provider', createdAt: new Date().toISOString() }] } }));
let providerCalls = 0;
const provider = createServer((req, res) => { if (req.method !== 'POST') { res.writeHead(405); return res.end(); } providerCalls += 1; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'sent', providerReference: `provider-${providerCalls}` })); });
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15', NORTHSTAR_PLAN_BILLING_DAY: '1', NORTHSTAR_MESSAGE_PROVIDER_URL: `http://127.0.0.1:${providerPort}`, NORTHSTAR_PAYMENT_PROVIDER_URL: `http://127.0.0.1:${providerPort}` };
let child;
const start = () => { child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); };
const stop = () => { if (child && !child.killed) child.kill(); child = null; };
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('automation worker server did not start'); };
const waitForProviderDispatch = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { if (providerCalls >= 2) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('scheduled provider dispatch did not run for both queues'); };

try {
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  start();
  await waitForServer();
  await waitForProviderDispatch();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  if (!login.response.ok) throw new Error('automation worker login failed');
  const messages = await request('/api/messages', { headers: { authorization: `Bearer ${login.body.token}` } });
  const audit = await request('/api/audit?search=automation.scheduled', { headers: { authorization: `Bearer ${login.body.token}` } });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (!messages.response.ok || !messages.body.items?.some((item) => item.jobId === 'automation_job' && item.template === 'appointment_reminder' && item.status === 'Sent') || !audit.response.ok || !audit.body.items?.some((item) => item.action === 'automation.scheduled') || !persisted.invoices?.some((item) => item.planId === 'automation_plan' && item.status === 'Due') || !persisted.planBillingCycles?.some((item) => item.trigger === 'scheduled') || persisted.paymentIntents?.find((item) => item.id === 'automation_intent')?.status !== 'Submitted (provider pending)' || providerCalls < 2) throw new Error('scheduled automation did not bill plans, queue and dispatch reminders, and dispatch payment intents');
  console.log('Northstar automation worker test passed');
} finally {
  stop();
  provider.close();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
