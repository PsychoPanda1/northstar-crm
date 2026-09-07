import { createHmac } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const runCase = async (label, providerConfig, expectedCheck, extraEnv = {}) => {
  const suffix = `${process.pid}-${Date.now()}-${label}`;
  const dataFile = join(tmpdir(), `northstar-tenant-provider-config-${suffix}.json`);
  const port = 10000 + ((process.pid + Date.now()) % 40000);
  const secret = 'northstar-tenant-provider-config-session-secret-32';
  const env = { ...process.env, ...extraEnv, NODE_ENV: 'production', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'false', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_BACKUP_FILE: `${dataFile}.backup`, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_REQUIRE_SQLITE: 'false', NORTHSTAR_SESSION_SECRET: secret, NORTHSTAR_METRICS_SECRET: 'metrics-secret-32-characters-for-test', NORTHSTAR_OWNER_EMAIL: 'owner@example.test', NORTHSTAR_OWNER_PASSWORD_DIGEST: createHmac('sha256', secret).update('tenant-provider-config-password').digest('hex'), NORTHSTAR_OWNER_TENANT_ID: 'johnson-service-co', NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services', timeZone: 'America/New_York' }]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ default: 'johnson-service-co' }), NORTHSTAR_SERVICE_ORIGINS_JSON: JSON.stringify({ default: ['https://landing.example.test'] }), NORTHSTAR_ALLOWED_ORIGINS: 'https://landing.example.test', NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId: 'johnson-service-co', id: 'inspection', name: 'Inspection', description: 'Configured inspection', priceFrom: '$100', durationMinutes: 60 }]), NORTHSTAR_PUBLIC_URL: 'https://crm.example.test', NORTHSTAR_DOCUMENT_PROVIDER_URL: 'https://document.example.test/deliver', NORTHSTAR_TENANT_PROVIDER_CONFIG_JSON: providerConfig, NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test', NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test', NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test', NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test', NORTHSTAR_FLEET_WEBHOOK_SECRET: 'fleet-secret-32-characters-for-test' };
  const child = spawn(process.execPath, ['server.mjs'], { env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = null;
    for (let attempt = 0; attempt < 300 && !ready; attempt += 1) { try { const response = await fetch(`${base}/api/ready`); ready = { response, body: await response.json().catch(() => ({})) }; } catch {} if (!ready) await new Promise((resolve) => setTimeout(resolve, 50)); }
    if (!ready || ready.response.status !== 503 || ready.body.checks?.[expectedCheck] !== false) throw new Error(`${label} provider configuration was not rejected with readiness evidence: ${JSON.stringify(ready?.body || null)}`);
  } finally {
    if (!child.killed) child.kill();
    for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.backup`, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
  }
};

await runCase('malformed', '{bad-json', 'tenantProviderConfiguration');
await runCase('unknown-tenant', JSON.stringify({ 'unknown-tenant': { lead: { url: 'https://lead.example.test/ingest' } } }), 'tenantProviderConfiguration');
await runCase('insecure-http', JSON.stringify({ 'johnson-service-co': { lead: { url: 'http://lead.example.test/ingest' } } }), 'tenantProviderConfiguration');
await runCase('insecure-document-http', JSON.stringify({ 'johnson-service-co': { document: { url: 'http://document.example.test/deliver' } } }), 'tenantProviderConfiguration');
await runCase('insecure-global-http', '{}', 'liveLeadProvider', { NORTHSTAR_REQUIRE_LIVE_PROVIDERS: 'true', NORTHSTAR_LEAD_PROVIDER_URL: 'http://external.example.test/ingest' });
console.log('Northstar tenant provider configuration test passed');
