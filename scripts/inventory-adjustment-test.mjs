import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6700 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-inventory-adjustment-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const materialId = 'cycle-count-material';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('inventory adjustment test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { materials: [{ id: materialId, tenantId, name: 'Cycle count valve', unit: 'each', unitCost: 12, onHand: 10, reorderPoint: 2, stockByLocation: { main: 10 } }], inventoryTransactions: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'cycle-count-1' };
  const adjusted = await post(`/api/materials/${materialId}/adjust`, { locationId: 'main', countedQuantity: 7, reason: 'Physical count after truck restock' }, headers);
  const duplicate = await post(`/api/materials/${materialId}/adjust`, { locationId: 'main', countedQuantity: 7, reason: 'Physical count after truck restock' }, headers);
  const conflict = await post(`/api/materials/${materialId}/adjust`, { locationId: 'main', countedQuantity: 8, reason: 'Different count' }, headers);
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const transaction = saved.inventoryTransactions[0];
  if (!login.response.ok || adjusted.response.status !== 200 || adjusted.body.material?.onHand !== 7 || adjusted.body.transaction?.quantity !== -3 || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || saved.materials[0].onHand !== 7 || transaction?.type !== 'Cycle count adjustment' || transaction.reason !== 'Physical count after truck restock') throw new Error('cycle-count adjustment did not safely reconcile stock or deduplicate');
  console.log('Northstar inventory adjustment test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
