import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5700 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-lead-followup-${process.pid}-${Date.now()}.json`);
const lead = { id: 'stale_lead', tenantId: 'clearwater-plumbing', name: 'Stale Lead', phone: '843-555-0123', email: 'stale@example.com', service: 'Drain cleaning', receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: 'New' };
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { leads: [lead] } }));
let providerCalls = 0;
const provider = createServer((req, res) => { if (req.method !== 'POST') { res.writeHead(405); return res.end(); } providerCalls += 1; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'sent', id: `lead-message-${providerCalls}` })); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_MESSAGE_PROVIDER_URL: `http://127.0.0.1:${providerPort}` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitFor = async (condition, message) => { for (let attempt = 0; attempt < 200; attempt += 1) { if (await condition()) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error(message); };
try {
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitFor(async () => (await fetch(`${base}/api/health`).catch(() => null))?.ok, 'lead follow-up server did not start');
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const run = await request('/api/automations/run', { method: 'POST', headers: { ...headers, 'idempotency-key': 'lead-followup-1' }, body: JSON.stringify({ channel: 'SMS', leadAgeHours: 2 }) });
  const duplicate = await request('/api/automations/run', { method: 'POST', headers: { ...headers, 'idempotency-key': 'lead-followup-1' }, body: JSON.stringify({ channel: 'SMS', leadAgeHours: 2 }) });
  const dispatch = await request('/api/integrations/messages/dispatch', { method: 'POST', headers, body: JSON.stringify({ limit: 10 }) });
  await waitFor(() => { try { return JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing']?.messages?.[0]?.status === 'Sent'; } catch { return false; } }, 'lead follow-up message was not delivered');
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (!login.response.ok || run.response.status !== 200 || run.body.leads?.queued !== 1 || duplicate.body.duplicate !== true || dispatch.body.sent !== 1 || providerCalls !== 1 || persisted.leads?.[0]?.status !== 'Contacted' || persisted.messages?.[0]?.template !== 'lead_followup') throw new Error('lead response automation was not queued, idempotent, or delivered safely');
  console.log('Northstar lead follow-up automation test passed');
} finally { if (child && !child.killed) child.kill(); provider.close(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
