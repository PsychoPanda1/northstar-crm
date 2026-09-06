import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5600 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-document-auto-queue-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_DOCUMENT_PROVIDER_URL: `http://127.0.0.1:${providerPort}` };
const base = `http://127.0.0.1:${port}`;
let child; let provider; let received = 0;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('document auto-queue test server did not start'); };

try {
  provider = createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; received += 1; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 'provider-document-auto-queue-1' })); });
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'customer-auto-queue', tenantId, name: 'Auto Queue Customer' }], estimates: [{ id: 'EST-auto-queue-1', tenantId, customerId: 'customer-auto-queue', customer: 'Auto Queue Customer', service: 'Water heater repair', value: '$400.00', amount: 400, status: 'Sent' }], invoices: [{ id: 'INV-auto-queue-1', tenantId, customerId: 'customer-auto-queue', customer: 'Auto Queue Customer', value: '$400.00', amount: 400, balance: 400, status: 'Due' }], messages: [{ id: 'MSG-auto-queue-1', tenantId, estimateId: 'EST-auto-queue-1', customerId: 'customer-auto-queue', customer: 'Auto Queue Customer', template: 'estimate_sent', publicEstimateUrl: 'https://crm.example/estimate', publicEstimatePdfUrl: 'https://crm.example/estimate.pdf', status: 'Queued (provider pending)' }, { id: 'MSG-auto-queue-2', tenantId, invoiceId: 'INV-auto-queue-1', customerId: 'customer-auto-queue', customer: 'Auto Queue Customer', template: 'payment_request', message: 'Your invoice has a remaining balance. Pay securely: https://crm.example/invoice?token=existing-token', status: 'Queued (provider pending)' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const run = await request('/api/automations/run', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'auto-queue-test' }, body: JSON.stringify({ channel: 'Email' }) });
  const afterPersist = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const queued = afterPersist.documentDeliveries?.find((item) => item.documentId === 'EST-auto-queue-1');
  const invoiceQueued = afterPersist.documentDeliveries?.find((item) => item.documentId === 'INV-auto-queue-1');
  const dispatch = await request('/api/integrations/documents/dispatch', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ limit: 10 }) });
  if (!login.response.ok || !run.response.ok || !queued || queued.status !== 'Pending provider' || queued.artifactUrl !== 'https://crm.example/estimate' || queued.pdfUrl !== 'https://crm.example/estimate.pdf' || !invoiceQueued || invoiceQueued.status !== 'Pending provider' || invoiceQueued.artifactUrl !== 'https://crm.example/invoice?token=existing-token' || !invoiceQueued.pdfUrl.includes('/api/public/invoice/pdf?token=') || dispatch.body.delivered !== 2 || received !== 2) throw new Error('automatic document queue materialization failed');
  console.log('Northstar document auto-queue test passed');
} finally { if (child && !child.killed) child.kill(); if (provider) await new Promise((resolve) => provider.close(resolve)); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
