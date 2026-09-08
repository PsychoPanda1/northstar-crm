import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6800 + Math.floor(Math.random() * 400);
const dataFile = join(tmpdir(), `northstar-inventory-replenishment-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const materialId = 'replenishment-valve';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('inventory replenishment test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { materials: [{ id: materialId, tenantId, name: 'Truck shutoff valve', sku: 'VALVE-TRUCK', unit: 'each', unitCost: 14, onHand: 3, reorderPoint: 5, reorderQuantity: 12, stockByLocation: { main: 3, truck_alpha: 0 } }], inventoryLocations: [{ id: 'truck_alpha', tenantId, name: 'Alex truck', type: 'Truck', status: 'Active' }], purchaseOrders: [{ id: 'PO-OPEN', tenantId, vendor: 'Supply House', materialId, material: 'Truck shutoff valve', quantity: 4, receivedQuantity: 0, unitCost: 14, status: 'Open', approvalStatus: 'Approved' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}` };
  const plan = await request('/api/inventory-replenishment', { headers });
  const item = plan.body.items?.find((candidate) => candidate.materialId === materialId);
  const orders = await request('/api/purchase-orders/replenishment', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'replenishment-batch-1' }, body: JSON.stringify({ materialIds: [materialId], vendor: 'Supply House' }) });
  const duplicate = await request('/api/purchase-orders/replenishment', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'replenishment-batch-1' }, body: JSON.stringify({ materialIds: [materialId], vendor: 'Supply House' }) });
  if (!login.response.ok || plan.response.status !== 200 || !item || item.priority !== 'Low stock' || item.targetQuantity !== 12 || item.openPurchaseQuantity !== 4 || item.recommendedPurchaseQuantity !== 5 || item.locations?.find((location) => location.id === 'truck_alpha')?.shortage !== 5 || plan.body.summary?.critical !== 0 || orders.response.status !== 201 || orders.body.orders?.[0]?.quantity !== 5 || duplicate.response.status !== 200 || !duplicate.body.duplicate) throw new Error('replenishment planning did not calculate tenant-scoped stock gaps, open purchase coverage, or safe batch ordering');
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (!persisted[tenantId].materials?.some((material) => material.id === materialId)) throw new Error('replenishment planning unexpectedly mutated inventory');
  console.log('Northstar inventory replenishment test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
