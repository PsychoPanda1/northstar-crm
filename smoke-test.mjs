import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const port = 4377;
const base = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-smoke-'));
const dataFile = join(tempDir, 'state.json');
const server = spawn(process.execPath, ['server.mjs'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port), NORTHSTAR_DATA_FILE: dataFile }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); const body = await response.json().catch(() => ({})); return { response, body }; };
const jsonOptions = (method, body, token) => ({ method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
try {
  for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 39) throw new Error('server did not start'); }
  const publicLead = await request('/api/public/leads', jsonOptions('POST', { service: 'plumbing', name: 'Smoke Lead', phone: '843-555-0100' }));
  assert(publicLead.response.status === 201 && publicLead.body.tenant.slug === 'clearwater-plumbing', 'public lead intake failed');
  const login = await request('/api/auth/demo-login?service=plumbing', jsonOptions('POST', {}));
  assert(login.response.ok, 'demo login failed');
  const token = login.body.token;
  const leadList = await request('/api/leads?search=Smoke%20Lead', { headers: { authorization: `Bearer ${token}` } });
  assert(leadList.body.items.length === 1, 'owner cannot see captured lead');
  const converted = await request(`/api/leads/${leadList.body.items[0].id}/convert`, jsonOptions('POST', { time: 'Tomorrow 9:00 AM' }, token));
  const convertedCustomer = await request('/api/customers?search=Smoke%20Lead', { headers: { authorization: `Bearer ${token}` } });
  assert(converted.response.status === 201 && converted.body.job.leadId === leadList.body.items[0].id && converted.body.job.customerId === converted.body.customer.id && convertedCustomer.body.items.length === 1, 'lead conversion failed');
  const estimate = await request('/api/estimates', jsonOptions('POST', { customer: 'Smoke Customer', service: 'Leak repair', amount: 425 }, token));
  const approved = await request(`/api/estimates/${estimate.body.id}/approve`, jsonOptions('POST', {}, token));
  const invoice = await request('/api/invoices', jsonOptions('POST', { estimateId: estimate.body.id }, token));
  const paid = await request(`/api/invoices/${invoice.body.id}/pay`, jsonOptions('POST', {}, token));
  assert(estimate.response.status === 201 && approved.body.status === 'Accepted' && invoice.response.status === 201 && paid.body.status === 'Paid', 'quote-to-cash flow failed');
  const otherLogin = await request('/api/auth/demo-login?service=powerwashing', jsonOptions('POST', {}));
  const otherLeads = await request('/api/leads?search=Smoke%20Lead', { headers: { authorization: `Bearer ${otherLogin.body.token}` } });
  assert(otherLeads.body.items.length === 0, 'tenant isolation failed');
  const logout = await request('/api/auth/logout', jsonOptions('POST', {}, token));
  const revoked = await request('/api/session', { headers: { authorization: `Bearer ${token}` } });
  assert(logout.response.ok && revoked.response.status === 401, 'logout revocation failed');
  console.log('Northstar smoke test passed: intake, conversion, quote-to-cash, isolation, logout');
} finally { server.kill(); rmSync(tempDir, { recursive: true, force: true }); }
