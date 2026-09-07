import { createHmac } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-tenant-provider-readiness-${suffix}.json`);
const port = 10000 + ((process.pid + Date.now()) % 40000);
const secret = 'northstar-tenant-provider-readiness-session-secret-32';
const providerConfig = JSON.stringify({ 'johnson-service-co': { lead: { url: 'https://lead.example.test/ingest' }, message: { url: 'https://message.example.test/send' }, inventory: { url: 'https://inventory.example.test/sync' }, accounting: { url: 'https://accounting.example.test/sync' }, payment: { url: 'https://payment.example.test/intents' }, payroll: { url: 'https://payroll.example.test/runs' } } });
const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'false', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_BACKUP_FILE: `${dataFile}.backup`, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_REQUIRE_SQLITE: 'false', NORTHSTAR_SESSION_SECRET: secret, NORTHSTAR_OWNER_EMAIL: 'owner@example.test', NORTHSTAR_OWNER_PASSWORD_DIGEST: createHmac('sha256', secret).update('provider-readiness-password').digest('hex'), NORTHSTAR_OWNER_TENANT_ID: 'johnson-service-co', NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services', timeZone: 'America/New_York' }]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ default: 'johnson-service-co' }), NORTHSTAR_SERVICE_ORIGINS_JSON: JSON.stringify({ default: ['https://landing.example.test'] }), NORTHSTAR_ALLOWED_ORIGINS: 'https://landing.example.test', NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId: 'johnson-service-co', id: 'inspection', name: 'Inspection', description: 'Configured inspection', priceFrom: '$100', durationMinutes: 60 }]), NORTHSTAR_PUBLIC_URL: 'https://crm.example.test', NORTHSTAR_REQUIRE_LIVE_PROVIDERS: 'true', NORTHSTAR_DOCUMENT_PROVIDER_URL: 'https://document.example.test/deliver', NORTHSTAR_TENANT_PROVIDER_CONFIG_JSON: providerConfig, NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test', NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test', NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test', NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test', NORTHSTAR_FLEET_WEBHOOK_SECRET: 'fleet-secret-32-characters-for-test' };
const child = spawn(process.execPath, ['server.mjs'], { env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
try {
  let ready = null;
  for (let attempt = 0; attempt < 300 && !ready?.response?.ok; attempt += 1) { try { ready = await request('/api/ready'); } catch {} if (!ready?.response?.ok) await new Promise((resolve) => setTimeout(resolve, 50)); }
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.test', password: 'provider-readiness-password' }) });
  const health = login.body.token ? await request('/api/integrations/health', { headers: { authorization: `Bearer ${login.body.token}` } }) : null;
  const liveChecks = ['liveLeadProvider', 'liveInventoryProvider', 'liveAccountingProvider', 'liveMessageProvider', 'livePaymentProvider', 'liveDocumentProvider', 'livePayrollProvider'];
  if (!ready?.response?.ok || liveChecks.some((key) => ready.body.checks?.[key] !== true) || !login.response.ok || health?.body?.checks?.leadProvider !== true || health.body.checks?.inventoryProvider !== true || health.body.checks?.accountingProvider !== true || health.body.checks?.messageProvider !== true || health.body.checks?.paymentProvider !== true || health.body.checks?.payrollProvider !== true) throw new Error('tenant provider overrides did not satisfy production readiness');
  console.log('Northstar tenant provider readiness test passed');
} finally { if (!child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.backup`, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); }
