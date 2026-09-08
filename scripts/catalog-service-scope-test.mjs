import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7600 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-catalog-service-scope-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ alpha: 'clearwater-plumbing', beta: 'clearwater-plumbing' }) };
const base = `http://127.0.0.1:${port}`;
env.NORTHSTAR_CATALOG_JSON = JSON.stringify([{ tenantId: 'clearwater-plumbing', id: 'configured-alpha-service', name: 'Configured alpha service', description: 'Only offered from alpha', priceFrom: '$199', durationMinutes: 60, serviceKeys: ['alpha'] }]);
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('catalog service scope test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=alpha', { service: 'alpha', role: 'owner' });
  const token = login.body.token;
  const created = await post('/api/catalog', { name: 'Shared tenant electrical add-on', description: 'Only offered from the electrical landing page', priceFrom: '$249', durationMinutes: 90 }, token);
  const scoped = await request(`/api/catalog/${encodeURIComponent(created.body.id)}/services`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': 'catalog-scope-1' }, body: JSON.stringify({ serviceKeys: ['beta'] }) });
  const duplicate = await request(`/api/catalog/${encodeURIComponent(created.body.id)}/services`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': 'catalog-scope-1' }, body: JSON.stringify({ serviceKeys: ['beta'] }) });
  const alphaCatalog = await request('/api/public/catalog?service=alpha');
  const betaCatalog = await request('/api/public/catalog?service=beta');
  const alphaAvailability = await request(`/api/public/availability?service=alpha&catalogItemId=${encodeURIComponent(created.body.id)}&days=3`);
  const betaAvailability = await request(`/api/public/availability?service=beta&catalogItemId=${encodeURIComponent(created.body.id)}&days=3`);
  const crossBooking = await post('/api/public/bookings?service=alpha', { name: 'Wrong service customer', phone: '843-555-0112', location: '123 Main Street', catalogItemId: created.body.id, slotId: 'tomorrow-0800-2099' });
  const alphaHas = alphaCatalog.body.items?.some((item) => item.id === created.body.id);
  const betaHas = betaCatalog.body.items?.some((item) => item.id === created.body.id);
  const alphaHasConfigured = alphaCatalog.body.items?.some((item) => item.id === 'configured-alpha-service');
  const betaHasConfigured = betaCatalog.body.items?.some((item) => item.id === 'configured-alpha-service');
  if (!login.response.ok || created.response.status !== 201 || scoped.response.status !== 200 || scoped.body.serviceKeys?.[0] !== 'beta' || duplicate.response.status !== 200 || !duplicate.body.duplicate || alphaHas || !betaHas || !alphaHasConfigured || betaHasConfigured || alphaAvailability.response.status !== 404 || betaAvailability.response.status !== 200 || crossBooking.response.status !== 404) throw new Error('catalog service scoping did not isolate attached landing pages');
  console.log('Northstar catalog service scope test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
