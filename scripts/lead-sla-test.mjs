import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5100 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-sla-${process.pid}-${Date.now()}.json`);
const receivedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { leads: [{ id: 'sla-lead-1', tenantId: 'clearwater-plumbing', name: 'SLA Test Lead', service: 'Plumbing', source: 'Landing page', phone: '843-555-0261', status: 'New', receivedAt }], jobs: [{ id: 'sla-job-1', tenantId: 'clearwater-plumbing', customer: 'Late Appointment Customer', service: 'Plumbing', status: 'Confirmed', time: 'Today 9:00 AM', startsAt: receivedAt }] } }));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_LEAD_RESPONSE_SLA_HOURS: '2', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const postJson = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead SLA test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('lead SLA test login failed');
  const token = login.body.token;
  const headers = { authorization: `Bearer ${token}` };
  const before = await request('/api/notifications', { headers });
  const dashboard = await request('/api/dashboard', { headers });
  const breached = (before.body.items || []).find((item) => item.leadId === 'sla-lead-1');
  const lateAppointment = (before.body.items || []).find((item) => item.jobId === 'sla-job-1');
  const status = await postJson('/api/leads/sla-lead-1/status', { status: 'Contacted', note: 'Called within the response workflow.' }, token);
  const after = await request('/api/notifications', { headers });
  const stillBreached = (after.body.items || []).some((item) => item.leadId === 'sla-lead-1' && item.title === 'Lead response SLA breached');
  const stillLeadAlert = (after.body.items || []).some((item) => item.leadId === 'sla-lead-1');
  if (before.response.status !== 200 || dashboard.response.status !== 200 || dashboard.body.metrics?.leadSlaBreaches !== '1' || breached?.title !== 'Lead response SLA breached' || breached?.status !== 'Urgent' || lateAppointment?.title !== 'Late appointment needs attention' || lateAppointment?.status !== 'Urgent' || status.response.status !== 200 || !status.body.lead?.firstResponseAt || stillBreached || stillLeadAlert) throw new Error('lead response SLA behavior failed');
  console.log('Northstar lead SLA test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
