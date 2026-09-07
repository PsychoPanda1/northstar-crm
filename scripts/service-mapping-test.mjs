import { createHmac } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4480 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-service-mapping-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const secret = 'northstar-service-mapping-test-secret-32';
const password = 'service-mapping-test-password';
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(port),
  NORTHSTAR_ALLOW_DEMO_LOGIN: 'false',
  NORTHSTAR_DATA_FILE: dataFile,
  NORTHSTAR_SESSION_FILE: sessionFile,
  NORTHSTAR_SESSION_SECRET: secret,
  NORTHSTAR_OWNER_EMAIL: 'owner@mapped.example',
  NORTHSTAR_OWNER_PASSWORD_DIGEST: createHmac('sha256', secret).update(password).digest('hex'),
  NORTHSTAR_OWNER_TENANT_ID: 'unmapped-service-co',
  NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'unmapped-service-co', businessName: 'Unmapped Service Co.', serviceLabel: 'Service', timeZone: 'America/New_York' }]),
  NORTHSTAR_SERVICE_TENANTS_JSON: '{}',
  NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId: 'unmapped-service-co', name: 'Inspection', description: 'Configured inspection', priceFrom: '$100' }]),
  NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test',
  NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test',
  NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test',
  NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test'
};
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const cleanup = () => { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); };
try {
  let ready = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/api/ready`); ready = { response, body: await response.json() }; break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!ready || ready.response.status !== 503 || ready.body.checks?.configuration !== false) throw new Error('production readiness accepted an unmapped configured tenant');
  console.log('Northstar service mapping readiness test passed');
} finally { cleanup(); }
