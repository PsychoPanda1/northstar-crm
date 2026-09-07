import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8300 + Math.floor(Math.random() * 400);
const dataFile = join(tmpdir(), `northstar-estimate-pricebook-archive-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const catalogItem = { id: 'CAT-ARCHIVE-90', tenantId, name: 'Annual plumbing inspection', description: 'Inspection with written recommendations', priceFrom: '$249', durationMinutes: 90, category: 'Maintenance', taxable: true, active: true, formNames: ['Annual inspection'], checklist: [{ label: 'Arrived on site' }, { label: 'Customer handoff completed' }] };
writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'customer-archive-1', tenantId, name: 'Archived Pricebook Customer', phone: '843-555-0134', location: '10 Snapshot Lane' }], catalogItems: [catalogItem] } }));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('estimate pricebook archive test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const availability = await request(`/api/public/availability?service=plumbing&catalogItemId=${encodeURIComponent(catalogItem.id)}&days=7`);
  const slot = availability.body.slotOptions?.[0];
  const estimateResult = await request('/api/estimates', { method: 'POST', headers, body: JSON.stringify({ customerId: 'customer-archive-1', catalogItemId: catalogItem.id, amount: 249 }) });
  const estimateId = estimateResult.body.id;
  const archived = await request(`/api/catalog/${catalogItem.id}`, { method: 'PATCH', headers, body: JSON.stringify({ active: false }) });
  const approved = await request(`/api/estimates/${estimateId}/approve`, { method: 'POST', headers, body: '{}' });
  const converted = await request(`/api/estimates/${estimateId}/convert`, { method: 'POST', headers, body: JSON.stringify({ slotId: slot?.id }) });
  const job = converted.body.job;
  if (!login.response.ok || availability.response.status !== 200 || !slot || estimateResult.response.status !== 201 || archived.response.status !== 200 || archived.body.active !== false || approved.response.status !== 200 || converted.response.status !== 201 || job?.catalogItemId !== catalogItem.id || job?.pricebookDurationAtCreation !== 90 || job?.requiredForms?.[0]?.formName !== 'Annual inspection' || job?.checklist?.map((item) => item.label).join('|') !== 'Arrived on site|Customer handoff completed') throw new Error('accepted estimate conversion lost archived pricebook scheduling or field requirements');
  console.log('Northstar archived estimate pricebook test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
