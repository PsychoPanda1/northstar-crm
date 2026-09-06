import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5600 + Math.floor(Math.random() * 100);
const providerPort = 5700 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-accounting-provider-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const received = [];
let purchaseOrderAttempts = 0;
const provider = createServer((req, res) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => { if (req.headers['idempotency-key'] === 'purchase_order:po-erp-1' && purchaseOrderAttempts++ === 0) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'temporary ERP outage' })); return; } received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: `erp-${received.length}`, status: 'accepted' })); }); });
const listen = (server, portNumber) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(portNumber, '127.0.0.1', resolve); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_ACCOUNTING_PROVIDER_URL: `http://127.0.0.1:${providerPort}/erp`, NORTHSTAR_ACCOUNTING_PROVIDER_API_KEY: 'accounting-test-key', NORTHSTAR_ACCOUNTING_RETRY_LIMIT: '1', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('accounting provider test server did not start'); };

try {
  const now = new Date().toISOString();
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'customer-1', tenantId, name: 'ERP Customer', phone: '843-555-0111' }], invoices: [{ id: 'invoice-erp-1', tenantId, customerId: 'customer-1', customer: 'ERP Customer', amount: 450, paidAmount: 450, balance: 0, status: 'Paid', due: '2026-09-01', createdAt: now }], payments: [{ id: 'payment-erp-1', tenantId, customerId: 'customer-1', invoiceId: 'invoice-erp-1', customer: 'ERP Customer', amount: 450, method: 'Card', reference: 'card-123', paidAt: now }], purchaseOrders: [{ id: 'po-erp-1', tenantId, vendor: 'Supply House', materialId: 'mat-erp-1', quantity: 10, receivedQuantity: 10, unitCost: 4, status: 'Received', createdAt: now }] } }));
  await listen(provider, providerPort);
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('accounting provider test login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const preflightHealth = await request('/api/integrations/health', { headers });
  const dispatch = await post('/api/integrations/accounting/dispatch', { limit: 10 }, headers);
  const retry = await post('/api/integrations/accounting/retry', { key: 'purchase_order:po-erp-1' }, headers);
  const retryDispatch = await post('/api/integrations/accounting/dispatch', { limit: 10 }, headers);
  const duplicate = await post('/api/integrations/accounting/dispatch', { limit: 10 }, headers);
  const health = await request('/api/integrations/health', { headers });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const sync = saved.accountingSync || [];
  const keys = sync.map((item) => item.key).sort();
  if (preflightHealth.body.accounting?.pending !== 3 || dispatch.response.status !== 200 || dispatch.body.delivered !== 2 || dispatch.body.retrying !== 1 || retry.response.status !== 200 || retry.body.sync?.syncState !== 'Pending' || retryDispatch.body.delivered !== 1 || duplicate.body.attempted !== 0 || received.length !== 3 || received.some((item) => item.headers.authorization !== 'Bearer accounting-test-key') || !keys.includes('invoice:invoice-erp-1') || !keys.includes('payment:payment-erp-1') || !keys.includes('purchase_order:po-erp-1') || sync.some((item) => item.syncState !== 'Delivered') || health.body.checks?.accountingProvider !== true || health.body.accounting?.pending !== 0) throw new Error('accounting provider delivery or health contract failed');
  console.log('Northstar accounting provider test passed');
} finally {
  if (child && !child.killed) child.kill();
  provider.close();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
