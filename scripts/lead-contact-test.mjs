import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4900 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-contact-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead contact test server did not start'); };
const postJson = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const lead = await postJson('/api/public/leads?service=plumbing', { name: 'Lead Contact Test', phone: '843-555-0173', source: 'Contact test' });
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!lead.response.ok || !login.response.ok) throw new Error('lead contact test setup failed');
  const token = login.body.token;
  const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'lead-contact-test-key' };
  const contact = await postJson(`/api/leads/${lead.body.id}/contact`, { channel: 'SMS', message: 'A quick follow-up from the service team.' }, headers);
  const duplicate = await postJson(`/api/leads/${lead.body.id}/contact`, { channel: 'SMS', message: 'A quick follow-up from the service team.' }, headers);
  const messages = await request('/api/messages', { headers: { authorization: `Bearer ${token}` } });
  const queued = (messages.body.items || []).find((item) => item.leadId === lead.body.id);
  const stageHistory = contact.body.lead?.stageHistory || [];
  if (contact.response.status !== 201 || contact.body.lead?.status !== 'Contacted' || stageHistory.length < 2 || stageHistory.at(-2)?.to !== 'New' || stageHistory.at(-1)?.to !== 'Contacted' || stageHistory.at(-1)?.actor !== 'workflow' || duplicate.response.status !== 200 || !duplicate.body.duplicate || queued?.status !== 'Queued (provider pending)') throw new Error('lead contact queue, stage history, or idempotency failed');
  console.log('Northstar lead contact test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
