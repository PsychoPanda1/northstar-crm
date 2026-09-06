import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4600 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-automation-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'automation_customer', tenantId: 'clearwater-plumbing', name: 'Automation Customer', phone: '843-555-0199', location: '1 Automation Way', status: 'Active' }], jobs: [{ id: 'automation_job', tenantId: 'clearwater-plumbing', customerId: 'automation_customer', customer: 'Automation Customer', service: 'Plumbing', status: 'Confirmed', time: 'Tomorrow 9:00 AM', startsAt, endsAt, technician: 'Alex Rivera' }] } }));
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15' };
let child;
const start = () => { child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); };
const stop = () => { if (child && !child.killed) child.kill(); child = null; };
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('automation worker server did not start'); };

try {
  start();
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  if (!login.response.ok) throw new Error('automation worker login failed');
  const messages = await request('/api/messages', { headers: { authorization: `Bearer ${login.body.token}` } });
  const audit = await request('/api/audit?search=automation.scheduled', { headers: { authorization: `Bearer ${login.body.token}` } });
  if (!messages.response.ok || !messages.body.items?.some((item) => item.jobId === 'automation_job' && item.template === 'appointment_reminder' && item.status === 'Queued (provider pending)') || !audit.response.ok || !audit.body.items?.some((item) => item.action === 'automation.scheduled')) throw new Error('scheduled automation did not queue and audit the reminder');
  console.log('Northstar automation worker test passed');
} finally {
  stop();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
