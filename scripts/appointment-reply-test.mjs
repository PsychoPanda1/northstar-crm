import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8900 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-appointment-reply-${process.pid}-${Date.now()}.json`);
const secret = 'appointment-reply-test-secret-32-characters';
const tenantId = 'clearwater-plumbing';
const customerId = 'reply-customer';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_MESSAGE_WEBHOOK_SECRET: secret };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const send = async (payload) => { const raw = JSON.stringify(payload); return request('/api/webhooks/messages/appointment-reply', { method: 'POST', headers: { 'content-type': 'application/json', 'x-northstar-signature': createHmac('sha256', secret).update(raw).digest('hex') }, body: raw }); };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('appointment reply test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: customerId, tenantId, name: 'Reply Customer', phone: '843-555-0188', location: '2 Reply Lane' }], jobs: [{ id: 'reply-job-1', tenantId, customerId, customer: 'Reply Customer', service: 'Drain service', time: 'Tomorrow at 10:00 AM', status: 'Confirmed', technician: 'Alex Rivera' }], messages: [], requests: [], messageEvents: [], auditEvents: [], activities: [] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const confirmed = await send({ tenantId, eventId: 'appointment-reply-1', jobId: 'reply-job-1', channel: 'SMS', from: '+1 (843) 555-0188', action: 'confirm', message: 'Yes, confirmed' });
  const duplicate = await send({ tenantId, eventId: 'appointment-reply-1', jobId: 'reply-job-1', channel: 'SMS', from: '+1 (843) 555-0188', action: 'confirm', message: 'Yes, confirmed' });
  const reschedule = await send({ tenantId, eventId: 'appointment-reply-2', jobId: 'reply-job-1', channel: 'SMS', from: '+1 (843) 555-0188', action: 'reschedule', message: 'Need a different time' });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (confirmed.response.status !== 201 || confirmed.body.action !== 'confirm' || !confirmed.body.job || duplicate.response.status !== 200 || !duplicate.body.duplicate || reschedule.response.status !== 201 || reschedule.body.request?.type !== 'Reschedule request' || persisted.jobs[0].customerConfirmedAt === undefined || !persisted.requests.some((item) => item.type === 'Reschedule request') || persisted.messages.filter((item) => item.appointmentAction).length !== 2) throw new Error('appointment reply workflow did not confirm, request, or deduplicate safely');
  console.log('Northstar appointment reply test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
