import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9890 + Math.floor(Math.random() * 30);
const dataFile = join(tmpdir(), `northstar-vendor-bills-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const tenantId = 'clearwater-plumbing';
const due = new Date(Date.now() - 35 * 86400000).toISOString();
const data = { [tenantId]: { materials: [], purchaseOrders: [], vendorBills: [] } };
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
try {
  writeFileSync(dataFile, JSON.stringify(data));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('vendor bills server did not start'); }
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  if (!login.response.ok) throw new Error('vendor bills login failed');
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const create = await request('/api/vendor-bills', { method: 'POST', headers: { ...headers, 'idempotency-key': 'vendor-bill-test-1' }, body: JSON.stringify({ vendor: 'Charleston Supply', invoiceNumber: 'CS-100', amount: 240, due }) });
  const duplicate = await request('/api/vendor-bills', { method: 'POST', headers: { ...headers, 'idempotency-key': 'vendor-bill-test-1' }, body: JSON.stringify({ vendor: 'Charleston Supply', invoiceNumber: 'CS-100', amount: 240, due }) });
  const id = create.body.id;
  const submit = await request(`/api/vendor-bills/${id}/submit`, { method: 'POST', headers, body: '{}' });
  const approve = await request(`/api/vendor-bills/${id}/approve`, { method: 'POST', headers, body: '{}' });
  const overrideApprove = await request(`/api/vendor-bills/${id}/approve`, { method: 'POST', headers, body: JSON.stringify({ overrideReason: 'Standalone vendor bill reviewed' }) });
  const pay = await request(`/api/vendor-bills/${id}/pay`, { method: 'POST', headers: { ...headers, 'idempotency-key': 'vendor-payment-test-1' }, body: JSON.stringify({ amount: 240, reference: 'ACH-100' }) });
  const report = await request('/api/reports/payables', { headers });
  const csv = await fetch(`${base}/api/export?type=vendor-bills`, { headers });
  const csvText = await csv.text();
  if (create.response.status !== 201 || duplicate.body.duplicate !== true || submit.response.status !== 200 || approve.response.status !== 200 || overrideApprove.body.duplicate !== true || pay.body.bill?.status !== 'Paid' || report.body.summary?.total !== 0 || !csv.ok || !csvText.includes('CS-100')) throw new Error('vendor bills contract failed');
  console.log('Northstar vendor bills test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
