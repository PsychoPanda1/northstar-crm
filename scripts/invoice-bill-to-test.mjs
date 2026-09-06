import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7600 + Math.floor(Math.random() * 900);
const dataFile = join(tmpdir(), `northstar-bill-to-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('bill-to test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'bill-customer', tenantId, name: 'Property Client', phone: '843-555-0199', location: '3 Billing Way' }], invoices: [{ id: 'INV-BILL-1', tenantId, customerId: 'bill-customer', customer: 'Property Client', amount: 500, value: '$500.00', paidAmount: 0, balance: 500, status: 'Due', due: 'Due on receipt' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const updated = await post('/api/invoices/INV-BILL-1/bill-to', { name: 'Lowcountry Property Group', email: 'ap@example.test', phone: '843-555-0100', address: '4 Accounts Plaza', terms: 'Net 30' }, { ...auth, 'idempotency-key': 'bill-to-1' });
  const duplicate = await post('/api/invoices/INV-BILL-1/bill-to', { name: 'Lowcountry Property Group', email: 'ap@example.test', phone: '843-555-0100', address: '4 Accounts Plaza', terms: 'Net 30' }, { ...auth, 'idempotency-key': 'bill-to-1' });
  const invalid = await post('/api/invoices/INV-BILL-1/bill-to', { name: 'Group', terms: 'Net 90' }, { ...auth, 'idempotency-key': 'bill-to-2' });
  const link = await post('/api/invoices/INV-BILL-1/payment-link', {}, auth);
  const paymentUrl = link.body.url ? new URL(link.body.url, base) : null;
  const publicInvoice = paymentUrl ? await request('/api/public/invoice?token=' + encodeURIComponent(paymentUrl.searchParams.get('token'))) : { response: { ok: false }, body: {} };
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || updated.response.status !== 200 || updated.body.invoice?.billTo?.terms !== 'Net 30' || duplicate.response.status !== 200 || !duplicate.body.duplicate || invalid.response.status !== 422 || link.response.status !== 200 || publicInvoice.response.status !== 200 || publicInvoice.body.billTo?.name !== 'Lowcountry Property Group' || publicInvoice.body.billTo?.terms !== 'Net 30' || persisted.invoices[0].billTo?.name !== 'Lowcountry Property Group') throw new Error('invoice bill-to workflow did not save, deduplicate, validate, or expose safely');
  console.log('Northstar invoice bill-to test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
