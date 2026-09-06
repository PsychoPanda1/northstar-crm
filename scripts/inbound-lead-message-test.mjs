import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5000 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-inbound-lead-message-${process.pid}-${Date.now()}.json`);
const secret = 'inbound-message-test-secret-32-characters';
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'false', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_MESSAGE_WEBHOOK_SECRET: secret };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('inbound lead message test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { leads: [{ id: 'inbound-lead-1', tenantId, name: 'Inbound Prospect', phone: '843-555-0198', email: 'prospect@example.test', service: 'Plumbing', status: 'New', source: 'Google' }], messages: [], messageEvents: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const payload = { tenantId, eventId: 'provider-inbound-1', channel: 'SMS', from: '+1 (843) 555-0198', message: 'Yes, please send me an appointment time.' };
  const raw = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json', 'x-northstar-signature': createHmac('sha256', secret).update(raw).digest('hex') };
  const inbound = await request('/api/webhooks/messages/inbound', { method: 'POST', headers, body: raw });
  const duplicate = await request('/api/webhooks/messages/inbound', { method: 'POST', headers, body: raw });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const message = persisted.messages.find((item) => item.id === inbound.body.message?.id);
  const lead = persisted.leads.find((item) => item.id === 'inbound-lead-1');
  if (inbound.response.status !== 201 || inbound.body.lead?.status !== 'Contacted' || message?.leadId !== lead.id || lead.status !== 'Contacted' || duplicate.response.status !== 200 || !duplicate.body.duplicate) throw new Error('inbound prospect message was not matched, advanced, and deduplicated');
  console.log('Northstar inbound lead message test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
