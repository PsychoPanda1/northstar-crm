import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5400 + Math.floor(Math.random() * 100);
const providerPort = 5500 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-inventory-provider-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const transactionId = 'inventory-provider-transaction';
const materialId = 'inventory-provider-material';
const received = [];
const provider = createServer((req, res) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => { received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'warehouse-tx-1', status: 'accepted' })); }); });
const listen = (server, portNumber) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(portNumber, '127.0.0.1', resolve); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_INVENTORY_PROVIDER_URL: `http://127.0.0.1:${providerPort}/inventory`, NORTHSTAR_INVENTORY_PROVIDER_API_KEY: 'inventory-test-key', NORTHSTAR_INVENTORY_RETRY_LIMIT: '1', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('inventory provider test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { materials: [{ id: materialId, tenantId, name: 'Copper coupling', sku: 'COP-001', unit: 'each', unitCost: 8.5, onHand: 14 }], inventoryTransactions: [{ id: transactionId, tenantId, materialId, type: 'Receipt', quantity: 14, source: 'warehouse-receipt', purchaseOrderId: 'PO-1001', createdAt: new Date().toISOString() }] } }));
  await listen(provider, providerPort);
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('inventory provider test login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const dispatch = await post('/api/integrations/inventory/dispatch', { limit: 10 }, headers);
  const duplicate = await post('/api/integrations/inventory/dispatch', { limit: 10 }, headers);
  const health = await request('/api/integrations/health', { headers });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const transaction = saved.inventoryTransactions.find((item) => item.id === transactionId);
  const event = received[0];
  if (dispatch.response.status !== 200 || dispatch.body.delivered !== 1 || duplicate.body.attempted !== 0 || received.length !== 1 || event?.headers?.['idempotency-key'] !== transactionId || event?.headers?.authorization !== 'Bearer inventory-test-key' || event.body.transactionId !== transactionId || event.body.material?.sku !== 'COP-001' || event.body.transaction?.purchaseOrderId !== 'PO-1001' || transaction?.providerSyncState !== 'Delivered' || transaction?.providerReference !== 'warehouse-tx-1' || health.body.checks?.inventoryProvider !== true || health.body.inventory?.pending !== 0) throw new Error('inventory provider delivery or health contract failed');
  console.log('Northstar inventory provider test passed');
} finally {
  if (child && !child.killed) child.kill();
  provider.close();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
