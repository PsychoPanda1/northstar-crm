import { createHmac } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4700 + Math.floor(Math.random() * 150);
const secret = 'northstar-user-invite-test-secret-32';
const dataFile = join(tmpdir(), `northstar-user-invite-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const password = 'owner-password-123';
const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'false', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_SESSION_SECRET: secret, NORTHSTAR_OWNER_EMAIL: 'owner@example.test', NORTHSTAR_OWNER_PASSWORD_DIGEST: createHmac('sha256', secret).update(password).digest('hex'), NORTHSTAR_OWNER_TENANT_ID: 'johnson-service-co', NORTHSTAR_TENANTS_JSON: JSON.stringify([{ slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services', timeZone: 'America/New_York' }]), NORTHSTAR_SERVICE_TENANTS_JSON: JSON.stringify({ plumbing: 'johnson-service-co' }), NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId: 'johnson-service-co', name: 'Inspection', description: 'Configured inspection', priceFrom: '$199' }]), NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'payment-secret-32-characters-for-test', NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'message-secret-32-characters-for-test', NORTHSTAR_CALL_WEBHOOK_SECRET: 'call-secret-32-characters-for-test', NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'financing-secret-32-characters-for-test' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let startupError = '';
child.stderr.on('data', (chunk) => { startupError += String(chunk); });
const base = `http://127.0.0.1:${port}`;
const cleanup = () => { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) unlinkSync(file); };
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };

try {
  let ready = null;
  for (let attempt = 0; attempt < 200 && !ready?.response?.ok; attempt += 1) { try { ready = await request('/api/ready'); } catch {} if (!ready?.response?.ok) await new Promise((resolve) => setTimeout(resolve, 100)); }
  if (!ready?.response?.ok) throw new Error(`server did not become ready${ready?.body ? `: ${JSON.stringify(ready.body)}` : ''}${startupError ? `: ${startupError.trim()}` : ''}`);
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', email: 'owner@example.test', password }) });
  if (!login.response.ok || !login.body.token) throw new Error('owner login failed');
  const authorization = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json', 'idempotency-key': 'invite-once' };
  const invite = await request('/api/users/invites', { method: 'POST', headers: authorization, body: JSON.stringify({ name: 'New Dispatcher', email: 'dispatcher@example.test', role: 'dispatcher' }) });
  if (invite.response.status !== 201 || !invite.body.inviteUrl || !invite.body.invite?.expiresAt) throw new Error('invite creation failed');
  if (JSON.stringify(invite.body).includes('tokenHash')) throw new Error('invite hash leaked');
  const token = new URL(invite.body.inviteUrl).searchParams.get('token');
  if (!token) throw new Error('invite token missing from returned URL');
  const accept = await request('/api/auth/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: 'dispatcher-password-123' }) });
  if (accept.response.status !== 201 || !accept.body.token || accept.body.owner?.role !== 'dispatcher') throw new Error('invite acceptance failed');
  const replay = await request('/api/auth/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: 'dispatcher-password-123' }) });
  if (replay.response.status !== 410 || replay.body.error !== 'invite_expired_or_invalid') throw new Error('invite was reusable');
  const secondInvite = await request('/api/users/invites', { method: 'POST', headers: { ...authorization, 'idempotency-key': 'invite-revoke-once' }, body: JSON.stringify({ name: 'Revoked Technician', email: 'revoked@example.test', role: 'technician' }) });
  if (secondInvite.response.status !== 201) throw new Error('second invite creation failed');
  const revoke = await request(`/api/users/invites/${encodeURIComponent(secondInvite.body.invite.id)}/revoke`, { method: 'POST', headers: authorization, body: '{}' });
  if (revoke.response.status !== 200 || revoke.body.invite?.status !== 'Revoked') throw new Error('invite revocation failed');
  const revokedToken = new URL(secondInvite.body.inviteUrl).searchParams.get('token');
  const revokedAccept = await request('/api/auth/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: revokedToken, password: 'technician-password-123' }) });
  if (revokedAccept.response.status !== 410) throw new Error('revoked invite was accepted');
  const users = await request('/api/users', { headers: { authorization: `Bearer ${login.body.token}` } });
  if (!users.response.ok || !users.body.items.some((item) => item.email === 'dispatcher@example.test' && item.role === 'dispatcher')) throw new Error('accepted account missing from owner user list');
  console.log('Northstar user invitation checks passed');
} finally { cleanup(); }
