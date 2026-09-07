import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4700 + Math.floor(Math.random() * 100);
const tenantId = 'clearwater-plumbing';
const customerId = 'schedule-customer';
const dataFile = join(tmpdir(), `northstar-plan-billing-${process.pid}-${Date.now()}.json`);
const period = new Date().toISOString().slice(0, 7);
const renewalAt = `${period}-01T12:00:00.000Z`;
const plans = [
  ['bimonthly', 'Every other month'],
  ['biannual', 'Biannual'],
  ['upfront', 'Upfront'],
  ['time-service', 'Time of service']
].map(([id, billingSchedule]) => ({ id: `schedule-${id}`, tenantId, customerId, customer: 'Schedule Customer', service: billingSchedule, amount: 100, status: 'Active', billingSchedule, renewalAt }));
writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: customerId, tenantId, name: 'Schedule Customer', phone: '843-555-0199', location: '1 Schedule Way', status: 'Active' }], plans, invoices: [] } }));
const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('plan billing schedule server did not start'); }
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  assert(login.response.ok, 'plan billing schedule login failed');
  const billed = await request('/api/plans/billing-cycle', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'schedule-cycle-1' }, body: JSON.stringify({ period, due: 'Due on receipt' }) });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const invoicePlanIds = new Set((persisted.invoices || []).map((invoice) => invoice.planId));
  assert(billed.response.ok && billed.body.created === 3 && invoicePlanIds.has('schedule-bimonthly') && invoicePlanIds.has('schedule-biannual') && invoicePlanIds.has('schedule-upfront') && !invoicePlanIds.has('schedule-time-service'), 'service agreement billing cadences were not applied correctly');
  console.log('Northstar service agreement billing schedule test passed');
} finally { child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
