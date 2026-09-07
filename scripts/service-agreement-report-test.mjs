import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9850 + Math.floor(Math.random() * 40);
const dataFile = join(tmpdir(), `northstar-service-agreement-report-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const tenantId = 'clearwater-plumbing';
const now = new Date();
const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const end = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
const plan = { id: 'PLAN-report-1', tenantId, customerId: 'customer-report-1', customer: 'Report Customer', service: 'Annual HVAC maintenance', amount: 99, value: '$99.00 / month', renewal: 'Monthly', billingSchedule: 'Monthly', autoRenew: true, visitsIncluded: 4, status: 'Active', createdAt: now.toISOString(), renewalAt: soon, customFields: { region: 'Charleston', units: '2' } };
const data = { [tenantId]: { customers: [{ id: 'customer-report-1', tenantId, name: 'Report Customer', location: '1 Service Way' }], plans: [plan], jobs: [{ id: 'job-report-1', tenantId, planId: plan.id, customerId: plan.customerId, customer: plan.customer, service: plan.service, location: '1 Service Way', status: 'Scheduled', time: 'Tomorrow 9:00 AM', startsAt: start, endsAt: end, materials: [{ materialId: 'mat-filter', sku: 'FILTER-20', name: '20x20 Filter', quantity: 2, unitCost: 8 }] }], invoices: [{ id: 'invoice-report-1', tenantId, planId: plan.id, customerId: plan.customerId, customer: plan.customer, amount: 99, paidAmount: 49, balance: 50, status: 'Partially paid', createdAt: now.toISOString() }], laborEntries: [{ id: 'labor-report-1', tenantId, jobId: 'job-report-1', hours: 1, hourlyRate: 50, cost: 50 }] } };
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
try {
  writeFileSync(dataFile, JSON.stringify(data));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('service agreement report server did not start'); }
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  if (!login.response.ok) throw new Error('service agreement report login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const report = await request('/api/reports/service-agreements?status=Active', { headers });
  const csv = await fetch(`${base}/api/export?type=service-agreements`, { headers });
  const csvText = await csv.text();
  const agreement = report.body.agreements?.[0];
  if (report.response.status !== 200 || report.body.summary?.total !== 1 || report.body.summary?.renewingSoon !== 1 || agreement?.visitsRemaining !== 4 || agreement?.billed !== 99 || agreement?.collected !== 49 || agreement?.estimatedMargin !== 33 || report.body.materialForecast?.[0]?.sku !== 'FILTER-20' || report.body.materialForecast?.[0]?.quantity !== 2 || !csv.ok || !csvText.includes('PLAN-report-1') || !csvText.includes('Annual HVAC maintenance')) throw new Error('service agreement report contract failed');
  console.log('Northstar service agreement report test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
