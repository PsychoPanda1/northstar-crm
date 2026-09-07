import { createHmac } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = 4397;
const base = `http://127.0.0.1:${port}`;
const secret = 'review-idempotency-test-secret-32';
const dataFile = join(tmpdir(), `northstar-review-idempotency-${process.pid}-${Date.now()}.json`);
const tenant = { slug: 'review-tenant', businessName: 'Review Tenant Co.', serviceLabel: 'Home services', timeZone: 'America/New_York' };
const job = { id: 'review-job-1', tenantId: tenant.slug, customerId: 'review-customer-1', customer: 'Review Customer', service: 'Drain repair', status: 'Completed', technician: 'Field Tech' };
writeFileSync(dataFile, JSON.stringify({ [tenant.slug]: { jobs: [job], customers: [{ id: job.customerId, tenantId: tenant.slug, name: job.customer }] } }));
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_SECRET: secret, NORTHSTAR_TENANTS_JSON: JSON.stringify([tenant]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ review: tenant.slug }) }, stdio: 'ignore' });
const token = () => { const payload = Buffer.from(JSON.stringify({ scope: 'review', jobId: job.id, tenantId: tenant.slug, exp: Date.now() + 60_000 })).toString('base64url'); return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`; };
const request = (key, body) => fetch(`${base}/api/public/review?token=${encodeURIComponent(token())}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) });
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('review server did not start'); }
  const first = await request('review-key-1', { rating: 5, comment: 'Excellent work.' });
  const duplicate = await request('review-key-1', { rating: 5, comment: 'Excellent work.' });
  const reused = await request('review-key-1', { rating: 4, comment: 'Different payload.' });
  const firstBody = await first.json(); const duplicateBody = await duplicate.json(); const reusedBody = await reused.json();
  if (first.status !== 201 || firstBody.duplicate !== false || duplicate.status !== 200 || duplicateBody.duplicate !== true || reused.status !== 409 || reusedBody.error !== 'idempotency_key_reused') throw new Error('review submission did not preserve idempotent retry semantics');
  console.log('Northstar review idempotency test passed');
} finally {
  server.kill();
  for (const file of [dataFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
