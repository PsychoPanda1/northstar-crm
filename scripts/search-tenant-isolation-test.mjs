import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5200 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-search-tenant-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('tenant search test server did not start'); };
const postJson = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const plumbingLogin = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const electricalLogin = await postJson('/api/auth/demo-login?service=electrician', { service: 'electrician', role: 'owner' });
  if (!plumbingLogin.response.ok || !electricalLogin.response.ok) throw new Error('tenant search logins failed');
  const plumbingToken = plumbingLogin.body.token;
  const electricalToken = electricalLogin.body.token;
  const plumbingCustomer = await request('/api/customers', { method: 'POST', headers: { authorization: `Bearer ${plumbingToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Cross-tenant-ordinary-match customer', phone: '843-555-0188', location: 'Search isolation address' }) });
  const electricalCustomer = await request('/api/customers', { method: 'POST', headers: { authorization: `Bearer ${electricalToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Electrical Search Customer', phone: '843-555-0189', location: 'Electrical search address' }) });
  const lead = await request('/api/leads', { method: 'POST', headers: { authorization: `Bearer ${electricalToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ customer: 'Electrical Search Customer', name: 'Other Tenant Lead', phone: '843-555-0190', service: 'Electrical repair', source: 'Landing page', utm_campaign: 'cross-tenant-ordinary-match' }) });
  const attributionLead = await request('/api/public/leads?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `search-attribution-${Date.now()}` }, body: JSON.stringify({ name: 'Attribution Search Lead', phone: '843-555-0191', requestedService: 'Plumbing repair', source: 'Landing page', utm_campaign: 'plumbing-attribution-regression' }) });
  const search = await request('/api/search?q=cross-tenant-ordinary-match', { headers: { authorization: `Bearer ${plumbingToken}` } });
  const attributionSearch = await request('/api/search?q=plumbing-attribution-regression', { headers: { authorization: `Bearer ${plumbingToken}` } });
  if (plumbingCustomer.response.status !== 201 || electricalCustomer.response.status !== 201 || lead.response.status !== 201 || attributionLead.response.status !== 201 || search.response.status !== 200 || search.body.results?.customers?.[0]?.name !== 'Cross-tenant-ordinary-match customer' || attributionSearch.response.status !== 200 || attributionSearch.body.results?.leads?.[0]?.attribution?.utm_campaign !== 'plumbing-attribution-regression' || !Array.isArray(attributionSearch.body.results?.customers)) throw new Error('cross-tenant or attribution search branch changed current-tenant results');
  console.log('Northstar tenant-scoped search branch test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
