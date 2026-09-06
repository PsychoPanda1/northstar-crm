import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4700 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-assignment-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead assignment test server did not start'); };
const postJson = (path, body, token, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const lead = await postJson('/api/public/leads?service=plumbing', { name: 'Lead Assignment Test', phone: '843-555-0166', source: 'Assignment test' }, null, 'lead-assignment-test-lead');
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!lead.response.ok || !login.response.ok) throw new Error('lead assignment test setup failed');
  const token = login.body.token;
  const valid = await postJson(`/api/leads/${lead.body.id}/assign`, { assignedTo: 'Taylor Brooks' }, token, 'lead-assignment-test-valid');
  const invalid = await postJson(`/api/leads/${lead.body.id}/assign`, { assignedTo: 'Unlisted Follow-up Name' }, token, 'lead-assignment-test-invalid');
  const lost = await postJson(`/api/leads/${lead.body.id}/status`, { status: 'Lost', note: 'No longer pursuing this request.' }, token, 'lead-assignment-test-lost');
  const notifications = await request('/api/notifications', { headers: { authorization: `Bearer ${token}` } });
  if (valid.response.status !== 200 || valid.body.lead.assignedTo !== 'Taylor Brooks' || invalid.response.status !== 422 || invalid.body.error !== 'lead_assignee_not_found' || lost.response.status !== 200 || notifications.body.items?.some((item) => item.leadId === lead.body.id)) throw new Error('lead ownership or lifecycle attention rules failed');
  console.log('Northstar lead assignment test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
