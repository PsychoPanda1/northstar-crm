import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5400 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-document-provider-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_DOCUMENT_PROVIDER_URL: `http://127.0.0.1:${providerPort}` };
const base = `http://127.0.0.1:${port}`;
let child; let provider; const received = [];
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('document provider test server did not start'); };

try {
  provider = createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 'provider-document-1', status: 'accepted' })); });
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'doc-customer', tenantId, name: 'Document Customer', phone: '843-555-0101' }], estimates: [{ id: 'EST-document-1', tenantId, customerId: 'doc-customer', customer: 'Document Customer', service: 'Drain repair', value: '$250.00', amount: 250, status: 'Sent' }], messages: [{ id: 'MSG-document-1', tenantId, estimateId: 'EST-document-1', customerId: 'doc-customer', customer: 'Document Customer', template: 'estimate_sent', channel: 'Email', status: 'Queued (provider pending)' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const result = await request('/api/integrations/documents/dispatch', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ limit: 10 }) });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId]; const delivery = saved.documentDeliveries?.[0];
  const retryDelivered = await request('/api/integrations/documents/retry', { method: 'POST', headers: { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ documentId: delivery.id }) });
  const listed = await request('/api/integrations/documents?status=Delivered', { headers: { authorization: `Bearer ${login.body.token}` } });
  const health = await request('/api/integrations/health', { headers: { authorization: `Bearer ${login.body.token}` } });
  if (!login.response.ok || result.response.status !== 200 || result.body.delivered !== 1 || received.length !== 1 || received[0].headers['idempotency-key'] !== delivery.id || received[0].body.documentType !== 'estimate' || received[0].body.documentId !== 'EST-document-1' || delivery.status !== 'Delivered' || !delivery.providerReference || retryDelivered.response.status !== 409 || listed.response.status !== 200 || listed.body.deliveries?.[0]?.id !== delivery.id || health.response.status !== 200 || health.body.documents?.delivered !== 1 || health.body.checks?.documentProvider !== true || !String(received[0].body.pdfUrl).includes('/api/public/estimate/pdf')) throw new Error('document provider handoff, delivery health, ledger, or retry guard failed');
  console.log('Northstar document provider test passed');
} finally { if (child && !child.killed) child.kill(); if (provider) await new Promise((resolve) => provider.close(resolve)); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
