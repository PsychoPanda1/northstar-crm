import { createServer } from 'node:http';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5200 + Math.floor(Math.random() * 100);
const providerPort = 5300 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-provider-${process.pid}-${Date.now()}.json`);
const received = [];
let providerAttempts = 0;
const provider = createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => { providerAttempts += 1; if (providerAttempts === 1) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'temporary outage' })); return; } received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'provider-lead-1', status: 'accepted' })); });
});
const listen = (server, portNumber) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(portNumber, '127.0.0.1', resolve); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_LEAD_PROVIDER_URL: `http://127.0.0.1:${providerPort}/leads`, NORTHSTAR_LEAD_PROVIDER_API_KEY: 'lead-test-key', NORTHSTAR_LEAD_RETRY_LIMIT: '1', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const postJson = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead provider test server did not start'); };

try {
  await listen(provider, providerPort);
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const lead = await postJson('/api/public/leads?service=plumbing', { name: 'Provider Lead', phone: '843-555-0188', source: 'Google Ads', utm_source: 'google', utm_campaign: 'summer-drain' });
  const retryLead = await postJson('/api/public/leads?service=plumbing', { name: 'Retry Provider Lead', phone: '843-555-0189', source: 'Google Ads', utm_source: 'google', utm_campaign: 'summer-drain' });
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!lead.response.ok || !retryLead.response.ok || !login.response.ok) throw new Error('lead provider test setup failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const dispatch = await postJson('/api/integrations/leads/dispatch', { limit: 10 }, headers);
  const duplicateDispatch = await postJson('/api/integrations/leads/dispatch', { limit: 10 }, headers);
  const leads = await request('/api/leads', { headers });
  const health = await request('/api/integrations/health', { headers });
  const delivered = (leads.body.items || []).find((item) => item.id === lead.body.id);
  const event = received[0];
  const retryRecord = (leads.body.items || []).find((item) => item.id === retryLead.body.id);
  const retry = await postJson(`/api/leads/${retryLead.body.id}/provider-retry`, {}, { ...headers, 'idempotency-key': 'lead-provider-retry-1' });
  const retryDispatch = await postJson('/api/integrations/leads/dispatch', { limit: 10 }, headers);
  const retryDuplicate = await postJson(`/api/leads/${retryLead.body.id}/provider-retry`, {}, { ...headers, 'idempotency-key': 'lead-provider-retry-1' });
  const finalLeads = await request('/api/leads', { headers });
  const finalRetryRecord = (finalLeads.body.items || []).find((item) => item.id === retryLead.body.id);
  if (dispatch.response.status !== 200 || dispatch.body.delivered !== 1 || dispatch.body.retrying !== 1 || duplicateDispatch.body.attempted !== 0 || received.length !== 2 || event?.headers?.['idempotency-key'] !== lead.body.id || event?.headers?.authorization !== 'Bearer lead-test-key' || event.body.leadId !== lead.body.id || event.body.attribution?.utm_campaign !== 'summer-drain' || delivered?.providerDeliveryState !== 'Delivered' || delivered?.providerReference !== 'provider-lead-1' || retryRecord?.providerDeliveryState !== 'Retry scheduled' || health.body.checks?.leadProvider !== true || health.body.leads?.pending !== 1 || health.body.leads?.retrying !== 1 || retry.response.status !== 200 || retry.body.duplicate || retryDispatch.body.delivered !== 1 || finalRetryRecord?.providerDeliveryState !== 'Delivered' || retryDuplicate.body.duplicate !== true || providerAttempts !== 3) throw new Error('lead provider delivery or health contract failed');
  console.log('Northstar lead provider test passed');
} finally {
  if (child && !child.killed) child.kill();
  provider.close();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
