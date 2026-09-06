import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7200 + Math.floor(Math.random() * 1000);
const dataFile = join(tmpdir(), `northstar-snapshot-import-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('snapshot import test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const snapshot = { schemaVersion: 1, tenant: { slug: 'clearwater-plumbing' }, collections: { customers: [{ id: 'import-customer', name: 'Imported Customer', phone: '843-555-0123' }], leads: [{ id: 'import-lead', name: 'Imported Lead', phone: '843-555-0124', status: 'New' }], teamMembers: [{ id: 'import-technician', name: 'Imported Technician', role: 'Field technician', skills: ['Plumbing'] }], catalogItems: [{ id: 'import-catalog', name: 'Imported Service', description: 'Imported service', priceFrom: '$125', durationMinutes: 60 }], capacityTargets: [{ id: 'import-capacity', date: '2026-09-07', technician: 'Imported Technician', targetMinutes: 420 }], customReportMetrics: ['Gross margin'], completedTasks: [1] } };
  const headers = { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'snapshot-import-1' };
  const imported = await post('/api/import/tenant-snapshot', snapshot, headers);
  const duplicate = await post('/api/import/tenant-snapshot', snapshot, headers);
  const conflictingTenant = await post('/api/import/tenant-snapshot', { ...snapshot, tenant: { slug: 'other-tenant' } }, { authorization: headers.authorization, 'idempotency-key': 'snapshot-import-2' });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (!login.response.ok || imported.response.status !== 200 || imported.body.counts.customers !== 1 || imported.body.counts.teamMembers !== 1 || imported.body.counts.catalogItems !== 1 || imported.body.counts.capacityTargets !== 1 || imported.body.counts.customReportMetrics !== 1 || imported.body.counts.completedTasks !== 1 || duplicate.response.status !== 200 || !duplicate.body.duplicate || conflictingTenant.response.status !== 422 || !persisted.customers.some((item) => item.id === 'import-customer') || !persisted.leads.some((item) => item.id === 'import-lead') || !persisted.teamMembers.some((item) => item.id === 'import-technician' && item.tenantId === 'clearwater-plumbing') || !persisted.catalogItems.some((item) => item.id === 'import-catalog' && item.tenantId === 'clearwater-plumbing') || !persisted.capacityTargets.some((item) => item.id === 'import-capacity' && item.tenantId === 'clearwater-plumbing') || !persisted.customReportMetrics.includes('Gross margin') || !persisted.completedTasks.includes(1)) throw new Error('tenant snapshot import did not apply safely or deduplicate');
  console.log('Northstar snapshot import test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
