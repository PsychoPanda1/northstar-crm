import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7800 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-quote-to-cash-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const estimate = { id: 'EST-Q2C-1', tenantId, customerId: 'customer-q2c-1', customer: 'Quote To Cash Customer', service: 'Water heater replacement', value: '$1,284.75', amount: 1284.75, subtotal: 1200, discount: 25, taxRate: 9.3404255319, tax: 109.75, status: 'Accepted', lineItems: [{ description: 'Water heater', quantity: 1, unitPrice: 1000, amount: 1000 }, { description: 'Installation labor', quantity: 1, unitPrice: 200, amount: 200 }] };
const changeOrder = { id: 'EST-Q2C-CHANGE-1', tenantId, customerId: 'customer-q2c-1', customer: estimate.customer, service: 'Code upgrade change order', value: '$300.00', amount: 300, subtotal: 300, discount: 0, taxRate: 0, tax: 0, status: 'Accepted', jobId: 'job-q2c-1', lineItems: [{ description: 'Code upgrade', quantity: 1, unitPrice: 300, amount: 300 }] };
const bulkEstimate = { id: 'EST-Q2C-2', tenantId, customerId: 'customer-q2c-1', customer: estimate.customer, service: 'Annual maintenance', value: '$600.00', amount: 600, subtotal: 500, discount: 0, taxRate: 20, tax: 100, status: 'Accepted', lineItems: [{ description: 'Maintenance visit', quantity: 1, unitPrice: 500, amount: 500 }] };
writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'customer-q2c-1', tenantId, name: estimate.customer, phone: '843-555-0188', location: '8 Quote Lane' }], estimates: [estimate, changeOrder, bulkEstimate], jobs: [{ id: 'job-q2c-1', tenantId, estimateId: estimate.id, customerId: estimate.customerId, customer: estimate.customer, service: estimate.service, status: 'Completed', location: '8 Quote Lane' }, { id: 'job-q2c-2', tenantId, estimateId: bulkEstimate.id, customerId: bulkEstimate.customerId, customer: bulkEstimate.customer, service: bulkEstimate.service, status: 'Completed', location: '8 Quote Lane' }] } }));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('quote-to-cash test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const detail = await request('/api/jobs/job-q2c-1', { headers });
  const preInvoiceJobCosts = await request('/api/job-costs', { headers });
  const preInvoiceQ2cCost = preInvoiceJobCosts.body.items?.find((item) => item.jobId === 'job-q2c-1');
  const result = await request('/api/jobs/job-q2c-1/invoice', { method: 'POST', headers, body: JSON.stringify({ due: 'Net 30' }) });
  const invoice = result.body.invoice;
  const bulk = await request('/api/dispatch/bulk-invoice', { method: 'POST', headers, body: JSON.stringify({ jobIds: ['job-q2c-2'], due: 'Net 30' }) });
  const bulkInvoice = bulk.body.invoices?.[0];
  const jobCosts = await request('/api/job-costs', { headers });
  const q2cCost = jobCosts.body.items?.find((item) => item.jobId === 'job-q2c-1');
  const technicianReport = await request('/api/reports/technicians', { headers });
  const unassignedTechnician = technicianReport.body.technicians?.find((item) => item.technician === 'Unassigned');
  if (!login.response.ok || detail.response.status !== 200 || detail.body.estimate?.amount !== estimate.amount + changeOrder.amount || detail.body.estimate?.lineItems?.[1]?.description !== 'Installation labor' || detail.body.estimate?.lineItems?.[2]?.description !== 'Code upgrade' || detail.body.job?.estimateSnapshot?.amount !== estimate.amount + changeOrder.amount || detail.body.job?.estimateSnapshot?.estimateIds?.length !== 2 || detail.body.job?.estimateSnapshot?.lineItems?.[2]?.description !== 'Code upgrade' || detail.body.costs?.revenue !== estimate.amount + changeOrder.amount || preInvoiceQ2cCost?.revenue !== `$${(estimate.amount + changeOrder.amount).toFixed(2)}` || result.response.status !== 201 || invoice?.estimateId !== estimate.id || invoice.estimateIds?.length !== 2 || invoice.amount !== estimate.amount + changeOrder.amount || invoice.lineItems?.length !== estimate.lineItems.length + changeOrder.lineItems.length || invoice.lineItems?.[2]?.description !== 'Code upgrade' || invoice.subtotal !== estimate.subtotal + changeOrder.subtotal || invoice.discount !== estimate.discount || bulk.response.status !== 201 || bulkInvoice?.estimateId !== bulkEstimate.id || bulkInvoice.amount !== bulkEstimate.amount || bulkInvoice.lineItems?.[0]?.description !== 'Maintenance visit' || bulkInvoice.taxRate !== bulkEstimate.taxRate || q2cCost?.revenue !== `$${(estimate.amount + changeOrder.amount).toFixed(2)}` || technicianReport.response.status !== 200 || !unassignedTechnician || unassignedTechnician.revenue !== estimate.amount + changeOrder.amount + bulkEstimate.amount) throw new Error('accepted estimate and change-order pricing did not carry into completed job invoice and operational reporting');
  console.log('Northstar quote-to-cash test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
