import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4750 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-message-retry-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'retry_customer', tenantId: 'clearwater-plumbing', name: 'Retry Customer', phone: '843-555-0199', location: '1 Retry Way', status: 'Active' }], messages: [{ id: 'retry_message', tenantId: 'clearwater-plumbing', customerId: 'retry_customer', customer: 'Retry Customer', channel: 'SMS', direction: 'outbound', message: 'Your appointment is confirmed.', status: 'Queued (provider pending)', queuedAt: new Date().toISOString() }] } }));
let providerCalls = 0;
const provider = createServer((req, res) => { providerCalls += 1; res.writeHead(providerCalls === 1 ? 503 : 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(providerCalls === 1 ? { error: 'temporary outage' } : { status: 'sent', providerReference: 'retry-provider-2' })); });
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_MESSAGE_PROVIDER_URL: `http://127.0.0.1:${providerPort}`, NORTHSTAR_MESSAGE_RETRY_LIMIT: '1' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('message retry server did not start'); };

try {
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const dispatch = await request('/api/integrations/messages/dispatch', { method: 'POST', headers, body: JSON.stringify({ limit: 10 }) });
  const messages = await request('/api/messages', { headers: { authorization: headers.authorization } });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'].messages.find((item) => item.id === 'retry_message');
  if (!login.response.ok || dispatch.response.status !== 200 || dispatch.body.retrying !== 1 || dispatch.body.failed !== 0 || providerCalls !== 1 || saved.status !== 'Queued (provider pending)' || saved.deliveryState !== 'Retry scheduled' || saved.deliveryAttempt !== 1 || !saved.nextRetryAt || !messages.body.items?.some((item) => item.id === 'retry_message' && item.deliveryState === 'Retry scheduled')) throw new Error('transient message failure was not scheduled for bounded retry');
  console.log('Northstar message retry test passed');
} finally {
  child.kill();
  provider.close();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
