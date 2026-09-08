import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (file) => new Promise((resolve) => { const child = spawn(process.execPath, ['scripts/validate-production-config.mjs'], { env: { ...process.env, NORTHSTAR_ENV_FILE: file }, stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = ''; let stderr = ''; child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; }); child.on('close', (code) => resolve({ code, stdout, stderr })); });
const digest = 'a'.repeat(64);
const base = [
  'NORTHSTAR_HOST=crm.example.test',
  'NORTHSTAR_PUBLIC_URL=https://crm.example.test',
  `NORTHSTAR_SESSION_SECRET=${'s'.repeat(40)}`,
  `NORTHSTAR_METRICS_SECRET=${'m'.repeat(40)}`,
  `NORTHSTAR_PAYMENT_WEBHOOK_SECRET=${'p'.repeat(40)}`,
  `NORTHSTAR_MESSAGE_WEBHOOK_SECRET=${'q'.repeat(40)}`,
  `NORTHSTAR_CALL_WEBHOOK_SECRET=${'c'.repeat(40)}`,
  `NORTHSTAR_FINANCING_WEBHOOK_SECRET=${'f'.repeat(40)}`,
  `NORTHSTAR_FLEET_WEBHOOK_SECRET=${'l'.repeat(40)}`,
  'NORTHSTAR_TENANTS_JSON=[{"slug":"clearwater-plumbing","businessName":"Clearwater Plumbing","serviceLabel":"Plumbing","timeZone":"America/New_York"},{"slug":"palmetto-electric","businessName":"Palmetto Electric","serviceLabel":"Electrical","timeZone":"America/New_York"}]',
  'NORTHSTAR_SERVICE_TENANTS_JSON={"plumbing":"clearwater-plumbing","electrician":"palmetto-electric"}',
  'NORTHSTAR_SERVICE_ORIGINS_JSON={"plumbing":["https://plumbing.example.test"],"electrician":["https://electric.example.test"]}',
  'NORTHSTAR_OWNER_EMAIL=owner@example.test',
  `NORTHSTAR_OWNER_PASSWORD_DIGEST=${digest}`,
  'NORTHSTAR_OWNER_TENANT_ID=clearwater-plumbing',
  `NORTHSTAR_OWNERS_JSON=[{"id":"owner-1","email":"owner@example.test","passwordDigest":"${digest}","tenantId":"clearwater-plumbing"},{"id":"owner-2","email":"owner2@example.test","passwordDigest":"${digest}","tenantId":"palmetto-electric"}]`,
  'NORTHSTAR_CATALOG_JSON=[{"tenantId":"clearwater-plumbing","id":"sink","name":"Sink repair","description":"Repair a leaking sink","priceFrom":"$199","serviceKeys":["plumbing"]},{"tenantId":"palmetto-electric","id":"panel","name":"Panel inspection","description":"Inspect an electrical panel","priceFrom":"$249","serviceKeys":["electrician"]}]'
];
const directory = await mkdtemp(join(tmpdir(), 'northstar-production-scope-'));
const validFile = join(directory, 'valid.env');
const invalidFile = join(directory, 'invalid.env');
try {
  await writeFile(validFile, base.join('\n'), 'utf8');
  const valid = await run(validFile);
  assert(valid.code === 0 && valid.stdout.includes('Production configuration preflight passed'), 'valid scoped catalog configuration should pass');
  await writeFile(invalidFile, base.join('\n').replace('"serviceKeys":["plumbing"]', '"serviceKeys":["electrician"]'), 'utf8');
  const invalid = await run(invalidFile);
  assert(invalid.code !== 0 && invalid.stderr.includes('cross-tenant or invalid landing-page service scope'), 'cross-tenant catalog scope should fail closed');
  console.log('Northstar production catalog scope preflight test passed');
} finally { await rm(directory, { recursive: true, force: true }); }
