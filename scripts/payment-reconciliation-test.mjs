import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5200 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-payment-reconciliation-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const otherTenant = 'palmetto-electric';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('payment reconciliation test server did not start'); };

try {
  const stale = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  writeFileSync(dataFile, JSON.stringify({
    [tenantId]: { invoices: [{ id: 'recon-invoice', tenantId, customer: 'Recon Customer', amount: 100, value: '$100.00', paidAmount: 100, balance: 0, status: 'Paid' }], payments: [{ id: 'recon-payment', tenantId, invoiceId: 'recon-invoice', customer: 'Recon Customer', amount: 60, method: 'Card', paidAt: stale }], paymentIntents: [{ id: 'recon-intent', tenantId, invoiceId: 'recon-invoice', customer: 'Recon Customer', amount: 40, status: 'Pending provider', createdAt: stale }], paymentEvents: [{ eventId: 'orphan-event', tenantId, intentId: 'missing-intent', status: 'succeeded', receivedAt: stale }] },
    [otherTenant]: { invoices: [{ id: 'other-invoice', tenantId: otherTenant, customer: 'Other Customer', amount: 20, paidAmount: 0, balance: 20, status: 'Due' }] }
  }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const report = await request('/api/payments/reconciliation', { headers });
  const technicianLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'technician' });
  const forbidden = await request('/api/payments/reconciliation', { headers: { authorization: `Bearer ${technicianLogin.body.token}` } });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (!login.response.ok || report.response.status !== 200 || report.body.healthy !== false || report.body.invoicesChecked !== 1 || report.body.discrepancies?.[0]?.invoiceId !== 'recon-invoice' || report.body.pendingIntents?.[0]?.id !== 'recon-intent' || report.body.orphanEvents?.[0]?.eventId !== 'orphan-event' || forbidden.response.status !== 403 || JSON.stringify(report.body).includes('other-invoice') || saved[otherTenant].invoices.length !== 1) throw new Error('payment reconciliation report, authorization, or tenant isolation failed');
  console.log('Northstar payment reconciliation test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
