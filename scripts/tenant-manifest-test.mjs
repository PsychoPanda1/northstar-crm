import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4396;
const base = `http://127.0.0.1:${port}`;
const tenant = { slug: 'manifest-service', businessName: 'Manifest Service Co.', serviceLabel: 'Service', timeZone: 'America/New_York', contactPhone: '(843) 555-0100', contactEmail: 'hello@manifest-service.example', serviceArea: 'Charleston area' };
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: `${process.cwd()}/.tenant-manifest-test.json`, NORTHSTAR_SESSION_SECRET: 'tenant-manifest-test-secret-32', NORTHSTAR_TENANTS_JSON: JSON.stringify([tenant]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ manifest: tenant.slug }) }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const response = await fetch(`${base}/api/public/tenant?service=manifest`);
  const body = await response.json();
  assert(response.status === 200 && body.tenant?.contactPhone === tenant.contactPhone && body.tenant?.contactEmail === tenant.contactEmail && body.tenant?.serviceArea === tenant.serviceArea, 'public tenant contact metadata was not exposed safely');
  assert(!JSON.stringify(body).includes('passwordDigest') && !JSON.stringify(body).includes('ownerEmail'), 'public tenant manifest exposed private account fields');
  console.log('Northstar tenant manifest checks passed');
} finally {
  server.kill();
}
