import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4900 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-search-pagination-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('search pagination test server did not start'); };
const postJson = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('search pagination test login failed');
  const token = login.body.token;
  for (const name of ['Pagination Search Alpha', 'Pagination Search Beta']) {
    const created = await postJson('/api/customers', { name, phone: '843-555-01' + (name.endsWith('Alpha') ? '61' : '62'), location: 'Search test address' }, token);
    if (created.response.status !== 201) throw new Error('search pagination test customer setup failed');
  }
  const vehicle = await postJson('/api/vehicles', { name: 'Search Fleet Van', makeModel: 'Ford Transit 250', licensePlate: 'SEARCH-42' }, token);
  if (vehicle.response.status !== 201) throw new Error('search pagination test vehicle setup failed');
  const material = await postJson('/api/materials', { name: 'Search copper fitting', sku: 'SEARCH-SKU-7', unit: 'each', unitCost: 4, onHand: 12, reorderPoint: 2 }, token);
  if (material.response.status !== 201) throw new Error('search pagination test material setup failed');
  const barcode = await request(`/api/materials/${material.body.id}/barcode`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': 'search-barcode-1' }, body: JSON.stringify({ barcode: 'SEARCH-BARCODE-7' }) });
  const headers = { authorization: `Bearer ${token}` };
  const first = await request('/api/search?q=pagination%20search&page=1&pageSize=1', { headers });
  const second = await request('/api/search?q=pagination%20search&page=2&pageSize=1', { headers });
  const invalid = await request('/api/search?q=pagination%20search&pageSize=51', { headers });
  const vehicleSearch = await request('/api/search?q=search-42', { headers });
  const materialLookup = await request('/api/materials/lookup?code=SEARCH-BARCODE-7', { headers });
  const firstIds = (first.body.results?.customers || []).map((item) => item.id);
  const secondIds = (second.body.results?.customers || []).map((item) => item.id);
  if (first.response.status !== 200 || second.response.status !== 200 || first.body.pagination?.page !== 1 || first.body.pagination?.pageSize !== 1 || first.body.pagination?.hasMore !== true || first.body.pagination?.nextPage !== 2 || second.body.pagination?.page !== 2 || second.body.pagination?.hasMore !== false || firstIds.length !== 1 || secondIds.length !== 1 || firstIds[0] === secondIds[0] || invalid.response.status !== 422 || vehicleSearch.response.status !== 200 || vehicleSearch.body.results?.vehicles?.[0]?.licensePlate !== 'SEARCH-42' || vehicleSearch.body.results?.vehicles?.[0]?.makeModel !== 'Ford Transit 250' || barcode.response.status !== 200 || materialLookup.response.status !== 200 || materialLookup.body.material?.name !== 'Search copper fitting' || materialLookup.body.locations?.find((item) => item.id === 'main')?.quantity !== 12) throw new Error('global search, fleet search, or material barcode contract failed');
  console.log('Northstar search pagination test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
