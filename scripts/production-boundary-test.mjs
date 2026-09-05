import { createHmac } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4300 + Math.floor(Math.random() * 200);
const dataFile = join(tmpdir(), `northstar-production-boundary-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
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
  NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test',
  NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test',
  NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test',
  NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test'
};

const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const cleanup = () => {
  child.kill();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) {
    if (existsSync(file)) unlinkSync(file);
  }
};
const getJson = async (path, options) => {
  const response = await fetch(`${base}${path}`, options);
  return { response, body: await response.json().catch(() => ({})) };
};

try {
  let ready = null;
  for (let attempt = 0; attempt < 100 && !ready?.ok; attempt += 1) {
    try { ready = await getJson('/api/ready'); } catch {}
    if (!ready?.response?.ok) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready?.response?.ok) throw new Error('production server did not become ready');

  const login = await getJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.NORTHSTAR_OWNER_EMAIL, password })
  });
  if (!login.response.ok) throw new Error('configured owner login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const collections = await Promise.all(['customers', 'leads', 'estimates', 'invoices', 'plans', 'activities', 'dispatch', 'team'].map((type) => getJson(`/api/${type}`, { headers })));
  if (collections.some(({ body }) => Array.isArray(body.items) && body.items.length > 0)) throw new Error('preview records exposed through authenticated API');
  const dashboard = await getJson('/api/dashboard', { headers });
  const zero = String.fromCharCode(36) + '0';
  if (dashboard.body.metrics?.jobs !== '0' || dashboard.body.metrics?.estimates !== '0' || dashboard.body.metrics?.revenue !== zero) throw new Error('synthetic dashboard baseline exposed');
  const catalog = await getJson('/api/public/catalog?service=plumbing');
  if (!catalog.response.ok || catalog.body.items?.length) throw new Error('preview catalog exposed publicly');
  const unknowns = await Promise.all(['/api/public/tenant?service=unknown', '/api/public/catalog?service=unknown', '/api/public/availability?service=unknown'].map((path) => getJson(path)));
  if (unknowns.some(({ response, body }) => response.status !== 404 || body.error !== 'unknown_service')) throw new Error('unknown service did not fail closed');
  const demoLogin = await getJson('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (demoLogin.response.status !== 404 || demoLogin.body.error !== 'demo_login_disabled') throw new Error('demo login remained enabled in production');
  console.log('Northstar production boundary test passed');
} finally {
  cleanup();
}
