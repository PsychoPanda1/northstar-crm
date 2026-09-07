import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9400 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-message-read-${process.pid}-${Date.now()}.json`);
const tenantId = 'johnson-service-co';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('message read test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'read-customer', tenantId, name: 'Read Customer', phone: '843-555-0123' }], messages: [{ id: 'MSG-READ-1', tenantId, customerId: 'read-customer', customer: 'Read Customer', channel: 'SMS', direction: 'inbound', message: 'Can someone help?', status: 'Received', receivedAt: new Date().toISOString() }, { id: 'MSG-SEND-1', tenantId, customerId: 'read-customer', customer: 'Read Customer', channel: 'SMS', direction: 'outbound', message: 'We will help.', status: 'Queued (provider pending)' }], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await request('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'default' }) });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const first = await request('/api/messages/MSG-READ-1/read', { method: 'POST', headers: auth });
  const duplicate = await request('/api/messages/MSG-READ-1/read', { method: 'POST', headers: auth });
  const outbound = await request('/api/messages/MSG-SEND-1/read', { method: 'POST', headers: auth });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || first.response.status !== 200 || first.body.duplicate || !first.body.message?.readAt || duplicate.response.status !== 200 || !duplicate.body.duplicate || outbound.response.status !== 422 || !persisted.messages[0].readAt || !persisted.auditEvents.some((item) => item.action === 'message.read')) throw new Error('message read state did not persist, deduplicate, or audit safely');
  console.log('Northstar message read-state test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
