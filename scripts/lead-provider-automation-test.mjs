import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5400 + Math.floor(Math.random() * 100);
const providerPort = 5500 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-automation-${process.pid}-${Date.now()}.json`);
const lead = { id: 'automation_lead', tenantId: 'clearwater-plumbing', name: 'Scheduled Lead', phone: '843-555-0190', email: 'scheduled@example.com', service: 'Drain cleaning', source: 'Google Ads', attribution: { utm_source: 'google', utm_campaign: 'scheduled-test' }, receivedAt: new Date().toISOString(), status: 'New' };
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { leads: [lead] } }));
let providerCalls = 0;
const provider = createServer((req, res) => { if (req.method !== 'POST') { res.writeHead(405); return res.end(); } providerCalls += 1; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: `scheduled-provider-${providerCalls}`, status: 'accepted' })); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15', NORTHSTAR_LEAD_PROVIDER_URL: `http://127.0.0.1:${providerPort}` };
const base = `http://127.0.0.1:${port}`;
let child;
const waitFor = async (condition, message) => { for (let attempt = 0; attempt < 200; attempt += 1) { if (await condition()) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error(message); };
try {
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitFor(async () => (await fetch(`${base}/api/health`).catch(() => null))?.ok, 'lead automation server did not start');
  await waitFor(() => providerCalls === 1, 'scheduled lead provider dispatch did not run');
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (persisted.leads?.[0]?.providerDeliveryState !== 'Delivered' || persisted.leads?.[0]?.providerReference !== 'scheduled-provider-1') throw new Error('scheduled lead provider delivery did not persist');
  console.log('Northstar scheduled lead provider test passed');
} finally { if (child && !child.killed) child.kill(); provider.close(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
