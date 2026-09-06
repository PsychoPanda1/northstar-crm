import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4396;
const base = `http://127.0.0.1:${port}`;
const tenant = { slug: 'manifest-service', businessName: 'Manifest Service Co.', serviceLabel: 'Service', timeZone: 'America/New_York', leadStages: ['New', 'Site visit', 'Estimate sent', 'Won'], contactPhone: '(843) 555-0100', contactEmail: 'hello@manifest-service.example', serviceArea: 'Charleston area' };
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: `${process.cwd()}/.tenant-manifest-test.json`, NORTHSTAR_SESSION_SECRET: 'tenant-manifest-test-secret-32', NORTHSTAR_TENANTS_JSON: JSON.stringify([tenant]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ manifest: tenant.slug }) }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const response = await fetch(`${base}/api/public/tenant?service=manifest`);
  const body = await response.json();
  assert(response.status === 200 && body.tenant?.contactPhone === tenant.contactPhone && body.tenant?.contactEmail === tenant.contactEmail && body.tenant?.serviceArea === tenant.serviceArea && JSON.stringify(body.tenant?.leadStages) === JSON.stringify(tenant.leadStages), 'public tenant configuration was not exposed safely');
  const leadResponse = await fetch(`${base}/api/public/leads?service=manifest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Pipeline Test', phone: '843-555-0111' }) });
  const leadBody = await leadResponse.json();
  const loginResponse = await fetch(`${base}/api/auth/demo-login?service=manifest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'manifest', role: 'owner' }) });
  const loginBody = await loginResponse.json();
  const statusResponse = await fetch(`${base}/api/leads/${leadBody.id}/status`, { method: 'POST', headers: { authorization: `Bearer ${loginBody.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'Site visit' }) });
  assert(leadResponse.status === 201 && loginResponse.ok && statusResponse.status === 200 && (await statusResponse.json()).lead?.status === 'Site visit', 'custom lead stage was not accepted by the owner pipeline');
  assert(!JSON.stringify(body).includes('passwordDigest') && !JSON.stringify(body).includes('ownerEmail'), 'public tenant manifest exposed private account fields');
  console.log('Northstar tenant manifest checks passed');
} finally {
  server.kill();
}
