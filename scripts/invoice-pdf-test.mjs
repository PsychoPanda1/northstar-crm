import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5300 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-invoice-pdf-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('invoice PDF test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { invoices: [{ id: 'INV-pdf-invoice', tenantId, customer: 'PDF Customer', amount: 125, value: '$125.00', paidAmount: 25, balance: 100, status: 'Partially paid', due: '2026-09-30', lineItems: [{ description: 'Drain service', quantity: 1, unitPrice: 125, amount: 125 }] }], payments: [{ id: 'pdf-payment', tenantId, invoiceId: 'INV-pdf-invoice', customer: 'PDF Customer', amount: 25, method: 'Card', reference: 'card-1', paidAt: new Date().toISOString() }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const invalid = await fetch(`${base}/api/public/invoice/pdf?token=invalid`);
  const login = await fetch(`${base}/api/auth/demo-login?service=plumbing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const link = await fetch(`${base}/api/invoices/INV-pdf-invoice/payment-link`, { method: 'POST', headers: { authorization: `Bearer ${(await login.json()).token}` } });
  const linkBody = await link.json();
  const token = new URL(linkBody.url, base).searchParams.get('token');
  const response = await fetch(`${base}/api/public/invoice/pdf?token=${encodeURIComponent(token)}`);
  const artifact = await response.arrayBuffer(); if (invalid.status !== 401 || !link.ok || response.status !== 200 || response.headers.get('content-type') !== 'application/pdf' || !response.headers.get('content-disposition')?.includes('pdf') || !artifact.byteLength) throw new Error('invoice PDF token validation or artifact generation failed');
  console.log('Northstar invoice PDF test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
