import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4300 + Math.floor(Math.random() * 200);
const dataFile = join(tmpdir(), `northstar-production-boundary-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const invalidPort = port + 1;
const strictPort = port + 2;
const oidcOnlyPort = port + 3;
const outboundUrlPort = port + 4;
const invalidDataFile = join(tmpdir(), `northstar-production-boundary-invalid-${process.pid}-${Date.now()}.json`);
const invalidSessionFile = `${invalidDataFile}.sessions`;
const strictDataFile = join(tmpdir(), `northstar-production-boundary-strict-${process.pid}-${Date.now()}.json`);
const strictSessionFile = `${strictDataFile}.sessions`;
const oidcOnlyDataFile = join(tmpdir(), `northstar-production-boundary-oidc-${process.pid}-${Date.now()}.json`);
const oidcOnlySessionFile = `${oidcOnlyDataFile}.sessions`;
const outboundUrlDataFile = join(tmpdir(), `northstar-production-boundary-outbound-url-${process.pid}-${Date.now()}.json`);
const outboundUrlSessionFile = `${outboundUrlDataFile}.sessions`;
const secret = 'northstar-production-boundary-secret-32';
const password = 'boundary-test-password';
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(port),
  NORTHSTAR_ALLOW_DEMO_LOGIN: 'false',
  NORTHSTAR_DATA_FILE: dataFile,
  NORTHSTAR_SESSION_FILE: sessionFile,
  NORTHSTAR_SESSION_SECRET: secret,
  NORTHSTAR_OWNER_EMAIL: 'owner@example.test',
  NORTHSTAR_OWNER_PASSWORD_DIGEST: createHmac('sha256', secret).update(password).digest('hex'),
  NORTHSTAR_OWNER_TENANT_ID: 'johnson-service-co',
  NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services', timeZone: 'America/New_York', requestResponseSlaHours: 48 }]),
  NORTHSTAR_REQUEST_RESPONSE_SLA_HOURS: '48',
  NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId: 'johnson-service-co', id: 'configured-inspection', name: 'Configured inspection', description: 'A configured production service', priceFrom: '$199', category: 'Inspection', durationMinutes: 90, taxable: true }]),
  NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test',
  NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test',
  NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test',
  NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test'
};

const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const invalidChild = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...env, PORT: String(invalidPort), NORTHSTAR_DATA_FILE: invalidDataFile, NORTHSTAR_SESSION_FILE: invalidSessionFile, NORTHSTAR_REQUEST_RESPONSE_SLA_HOURS: '0', NORTHSTAR_OIDC_ISSUER: 'https://issuer.example.test', NORTHSTAR_ALLOWED_ORIGINS: 'https://valid.example,not-an-origin', NORTHSTAR_SERVICE_ORIGINS_JSON: JSON.stringify({ plumbing: ['not a valid origin'] }) }, stdio: 'ignore' });
const strictChild = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...env, PORT: String(strictPort), NORTHSTAR_DATA_FILE: strictDataFile, NORTHSTAR_SESSION_FILE: strictSessionFile, NORTHSTAR_REQUIRE_LIVE_PROVIDERS: 'true' }, stdio: 'ignore' });
const oidcOnlyChild = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...env, PORT: String(oidcOnlyPort), NORTHSTAR_DATA_FILE: oidcOnlyDataFile, NORTHSTAR_SESSION_FILE: oidcOnlySessionFile, NORTHSTAR_OWNER_EMAIL: '', NORTHSTAR_OWNER_PASSWORD_DIGEST: '', NORTHSTAR_OWNERS_JSON: '[]', NORTHSTAR_STAFF_JSON: '[]', NORTHSTAR_OIDC_ISSUER: 'https://issuer.example.test', NORTHSTAR_OIDC_AUDIENCE: 'northstar-owner-portal', NORTHSTAR_OIDC_JWKS_URL: 'https://issuer.example.test/.well-known/jwks.json', NORTHSTAR_OIDC_ACCOUNTS_JSON: JSON.stringify([{ subject: 'oidc-owner', id: 'oidc-owner', name: 'OIDC Owner', role: 'owner', tenantId: 'johnson-service-co' }]) }, stdio: 'ignore' });
const outboundUrlChild = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...env, PORT: String(outboundUrlPort), NORTHSTAR_DATA_FILE: outboundUrlDataFile, NORTHSTAR_SESSION_FILE: outboundUrlSessionFile, NORTHSTAR_PUBLIC_URL: 'http://crm.example.test', NORTHSTAR_MESSAGE_PROVIDER_URL: 'https://provider.example.test/messages' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const invalidBase = `http://127.0.0.1:${invalidPort}`;
const strictBase = `http://127.0.0.1:${strictPort}`;
const oidcOnlyBase = `http://127.0.0.1:${oidcOnlyPort}`;
const outboundUrlBase = `http://127.0.0.1:${outboundUrlPort}`;
const cleanup = () => {
  child.kill();
  invalidChild.kill();
  strictChild.kill();
  oidcOnlyChild.kill();
  outboundUrlChild.kill();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, invalidDataFile, invalidSessionFile, `${invalidDataFile}.tmp`, strictDataFile, strictSessionFile, `${strictDataFile}.tmp`, oidcOnlyDataFile, oidcOnlySessionFile, `${oidcOnlyDataFile}.tmp`, outboundUrlDataFile, outboundUrlSessionFile, `${outboundUrlDataFile}.tmp`]) {
    if (existsSync(file)) unlinkSync(file);
  }
};
const getJson = async (path, options) => {
  const response = await fetch(`${base}${path}`, options);
  return { response, body: await response.json().catch(() => ({})) };
};
const getJsonFrom = async (origin, path, options) => {
  const response = await fetch(`${origin}${path}`, options);
  return { response, body: await response.json().catch(() => ({})) };
};

try {
  const ownerShell = readFileSync(join(root, 'index.html'), 'utf8');
  if (/Example customer|Example property group|JOB-EXAMPLE|EST-EXAMPLE/.test(ownerShell)) throw new Error('demo-looking records embedded in owner shell');
  let ready = null;
  for (let attempt = 0; attempt < 200 && !ready?.ok; attempt += 1) {
    try { ready = await getJson('/api/ready'); } catch {}
    if (!ready?.response?.ok) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready?.response?.ok || ready.body.checks?.configuration !== true || ready.body.checks?.requestResponseSlaConfiguration !== true) throw new Error('production server did not become ready with valid configuration');
  const openapiResponse = await fetch(`${base}/api/openapi.yaml`);
  const openapiText = await openapiResponse.text();
  if (!openapiResponse.ok || !openapiResponse.headers.get('content-type')?.includes('application/yaml') || !openapiText.includes('openapi: 3.0.3') || !openapiText.includes('/api/public/bookings:')) throw new Error('canonical OpenAPI endpoint was not served');
  let invalidReady = null;
  for (let attempt = 0; attempt < 200 && !invalidReady; attempt += 1) {
    try { invalidReady = await getJsonFrom(invalidBase, '/api/ready'); } catch {}
    if (!invalidReady) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!invalidReady || invalidReady.response.status !== 503 || invalidReady.body.checks?.requestResponseSlaConfiguration !== false || invalidReady.body.checks?.identityProviderConfiguration !== false || invalidReady.body.checks?.allowedOriginsConfiguration !== false || invalidReady.body.checks?.serviceOriginConfiguration !== false) throw new Error('invalid production configuration did not fail readiness');
  let strictReady = null;
  for (let attempt = 0; attempt < 200 && !strictReady; attempt += 1) {
    try { strictReady = await getJsonFrom(strictBase, '/api/ready'); } catch {}
    if (!strictReady) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!strictReady || strictReady.response.status !== 503 || strictReady.body.checks?.liveLeadProvider !== false || strictReady.body.checks?.liveMessageProvider !== false || strictReady.body.checks?.livePaymentProvider !== false) throw new Error('live provider requirement did not fail production readiness');
  let outboundUrlReady = null;
  for (let attempt = 0; attempt < 200 && !outboundUrlReady; attempt += 1) {
    try { outboundUrlReady = await getJsonFrom(outboundUrlBase, '/api/ready'); } catch {}
    if (!outboundUrlReady) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!outboundUrlReady || outboundUrlReady.response.status !== 503 || outboundUrlReady.body.checks?.publicUrlConfiguration !== false) throw new Error('provider-backed delivery did not reject a non-HTTPS public URL');
  let oidcOnlyReady = null;
  for (let attempt = 0; attempt < 200 && !oidcOnlyReady; attempt += 1) {
    try { oidcOnlyReady = await getJsonFrom(oidcOnlyBase, '/api/ready'); } catch {}
    if (!oidcOnlyReady) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!oidcOnlyReady || !oidcOnlyReady.response.ok || oidcOnlyReady.body.checks?.identityProviderConfiguration !== true || oidcOnlyReady.body.checks?.ownerAuth !== true) throw new Error('OIDC-only owner configuration did not become production-ready');

  const login = await getJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.NORTHSTAR_OWNER_EMAIL, password })
  });
  if (!login.response.ok) throw new Error('configured owner login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const snapshot = await getJson('/api/export?type=tenant-snapshot', { headers });
  if (!snapshot.response.ok || !snapshot.response.headers.get('content-type')?.includes('application/json') || snapshot.body.schemaVersion !== 1 || snapshot.body.tenant?.slug !== 'johnson-service-co' || Object.values(snapshot.body.collections || {}).some((items) => !Array.isArray(items))) throw new Error('tenant snapshot export was not safe or tenant-scoped');
  const snapshotValidation = await getJson('/api/import/tenant-snapshot/validate', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(snapshot.body) });
  const mismatchedSnapshotValidation = await getJson('/api/import/tenant-snapshot/validate', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ ...snapshot.body, tenant: { ...snapshot.body.tenant, slug: 'other-tenant' } }) });
  if (!snapshotValidation.response.ok || snapshotValidation.body.valid !== true || mismatchedSnapshotValidation.body.valid !== false || !mismatchedSnapshotValidation.body.errors?.includes('snapshot_tenant_mismatch')) throw new Error('tenant snapshot validation did not fail closed');
  const collections = await Promise.all(['customers', 'leads', 'estimates', 'invoices', 'plans', 'activities', 'dispatch', 'team'].map((type) => getJson(`/api/${type}`, { headers })));
  if (collections.some(({ body }) => Array.isArray(body.items) && body.items.length > 0)) throw new Error('preview records exposed through authenticated API');
  const dashboard = await getJson('/api/dashboard', { headers });
  const zero = String.fromCharCode(36) + '0';
  if (dashboard.body.metrics?.jobs !== '0' || dashboard.body.metrics?.estimates !== '0' || dashboard.body.metrics?.revenue !== zero) throw new Error('synthetic dashboard baseline exposed');
  const catalog = await getJson('/api/public/catalog?service=default');
  if (!catalog.response.ok || catalog.body.items?.length !== 1 || catalog.body.items[0].id !== 'configured-inspection' || catalog.body.tenant?.requestResponseSlaHours !== 48) throw new Error('configured production catalog was not exposed safely');
  const unknowns = await Promise.all(['/api/public/tenant?service=unknown', '/api/public/catalog?service=unknown', '/api/public/availability?service=unknown'].map((path) => getJson(path)));
  if (unknowns.some(({ response, body }) => response.status !== 404 || body.error !== 'unknown_service')) throw new Error('unknown service did not fail closed');
  const demoLogin = await getJson('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (demoLogin.response.status !== 404 || demoLogin.body.error !== 'demo_login_disabled') throw new Error('demo login remained enabled in production');
  console.log('Northstar production boundary test passed');
} finally {
  cleanup();
}
