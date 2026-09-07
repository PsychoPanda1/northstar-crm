import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 21000 + Math.floor(Math.random() * 1000);
const dataFile = join(tmpdir(), `northstar-workspace-settings-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const postJson = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 400; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('workspace settings test server did not start'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  assert(login.response.ok, 'workspace settings owner login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const initial = await request('/api/settings/workspace', { headers });
  const landingPages = await request('/api/settings/landing-pages', { headers });
  const claimed = await request('/api/settings/landing-pages', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'landing-page-key-1' }, body: JSON.stringify({ service: 'commercial-plumbing' }) });
  const claimedDuplicate = await request('/api/settings/landing-pages', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'landing-page-key-1' }, body: JSON.stringify({ service: 'commercial-plumbing' }) });
  const update = { businessName: 'Clearwater Plumbing Group', serviceLabel: 'Emergency Plumbing', timeZone: 'America/New_York', appointmentMinutes: 75, contactPhone: '(843) 555-0199', contactEmail: 'hello@clearwater.example', serviceArea: 'Charleston and Mount Pleasant', intakeFields: [{ id: 'issue_type', type: 'select', label: 'Issue type', required: true, options: ['Leak', 'Clog', 'Other'] }] };
  const updated = await request('/api/settings/workspace', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'workspace-settings-1' }, body: JSON.stringify(update) });
  const duplicate = await request('/api/settings/workspace', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'workspace-settings-1' }, body: JSON.stringify(update) });
  const manifest = await request('/api/public/tenant?service=plumbing');
  const claimedManifest = await request('/api/public/tenant?service=commercial-plumbing');
  assert(initial.response.status === 200 && initial.body.workspace?.businessName === 'Clearwater Plumbing', 'workspace settings were not readable');
  assert(landingPages.response.status === 200 && landingPages.body.serviceKeys?.includes('plumbing'), 'landing page keys were not readable');
  assert(claimed.response.status === 201 && claimed.body.service === 'commercial-plumbing' && claimedDuplicate.response.status === 200 && claimedDuplicate.body.duplicate === true && claimedManifest.response.status === 200 && claimedManifest.body.tenant?.slug === 'clearwater-plumbing', 'landing page service key claim was not safe or routable');
  assert(updated.response.status === 200 && updated.body.workspace?.businessName === update.businessName && updated.body.workspace?.appointmentMinutes === 75 && updated.body.workspace?.contactEmail === update.contactEmail && updated.body.workspace?.serviceArea === update.serviceArea && updated.body.workspace?.intakeFields?.[0]?.id === 'issue_type', 'workspace settings update was not applied');
  assert(duplicate.response.status === 200 && duplicate.body.duplicate === true, 'workspace settings update was not idempotent');
  assert(manifest.response.status === 200 && manifest.body.tenant?.businessName === update.businessName && manifest.body.tenant?.serviceLabel === update.serviceLabel && manifest.body.tenant?.appointmentMinutes === 75 && manifest.body.tenant?.contactPhone === update.contactPhone && manifest.body.tenant?.contactEmail === update.contactEmail && manifest.body.tenant?.serviceArea === update.serviceArea, 'public landing manifest did not reflect workspace settings');
  const invalid = await request('/api/settings/workspace', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ appointmentMinutes: 5 }) });
  assert(invalid.response.status === 422, 'invalid workspace settings were accepted');
  console.log('Northstar workspace settings test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
