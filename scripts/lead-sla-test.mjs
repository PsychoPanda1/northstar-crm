import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5100 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-sla-${process.pid}-${Date.now()}.json`);
const receivedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { leads: [{ id: 'sla-lead-1', tenantId: 'clearwater-plumbing', name: 'SLA Test Lead', service: 'Plumbing', source: 'Landing page', phone: '843-555-0261', status: 'New', receivedAt }], jobs: [{ id: 'sla-job-1', tenantId: 'clearwater-plumbing', customer: 'Late Appointment Customer', service: 'Plumbing', status: 'Confirmed', technician: 'Alex Rivera', time: 'Today 9:00 AM', startsAt: receivedAt }], estimates: [{ id: 'sla-estimate-1', tenantId: 'clearwater-plumbing', customer: 'Estimate Follow-up Customer', service: 'Plumbing', status: 'Sent', value: '$500', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }], invoices: [{ id: 'sla-invoice-1', tenantId: 'clearwater-plumbing', customer: 'Overdue Invoice Customer', value: '$750', amount: 750, balance: 750, status: 'Due', dueAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }], requests: [{ id: 'REQ-sla-request-1', tenantId: 'clearwater-plumbing', customer: 'Overdue Request Customer', type: 'Question', status: 'Open', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }, { id: 'REQ-sla-request-fresh', tenantId: 'clearwater-plumbing', customer: 'Fresh Request Customer', type: 'Question', status: 'Open', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }, { id: 'REQ-sla-request-urgent', tenantId: 'clearwater-plumbing', customer: 'Urgent Request Customer', type: 'Question', priority: 'Urgent', status: 'Open', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }] } }));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_LEAD_RESPONSE_SLA_HOURS: '2', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const postJson = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead SLA test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('lead SLA test login failed');
  const token = login.body.token;
  const headers = { authorization: `Bearer ${token}` };
  const assignmentKey = 'sla-request-assignment-1';
  const assignmentUpdate = await request('/api/requests/REQ-sla-request-fresh/assign', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': assignmentKey }, body: JSON.stringify({ assignedTo: 'Taylor Brooks' }) });
  const assignmentDuplicate = await request('/api/requests/REQ-sla-request-fresh/assign', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': assignmentKey }, body: JSON.stringify({ assignedTo: 'Taylor Brooks' }) });
  const assignmentConflict = await request('/api/requests/REQ-sla-request-fresh/assign', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': assignmentKey }, body: JSON.stringify({ assignedTo: 'Jordan Smith' }) });
  const priorityKey = 'sla-request-priority-1';
  const priorityUpdate = await request('/api/requests/REQ-sla-request-fresh/priority', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': priorityKey }, body: JSON.stringify({ priority: 'High' }) });
  const priorityDuplicate = await request('/api/requests/REQ-sla-request-fresh/priority', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': priorityKey }, body: JSON.stringify({ priority: 'High' }) });
  const priorityConflict = await request('/api/requests/REQ-sla-request-fresh/priority', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': priorityKey }, body: JSON.stringify({ priority: 'Urgent' }) });
  const before = await request('/api/notifications', { headers });
  const dashboard = await request('/api/dashboard', { headers });
  const breached = (before.body.items || []).find((item) => item.leadId === 'sla-lead-1');
  const lateAppointment = (before.body.items || []).find((item) => item.jobId === 'sla-job-1');
  const estimateFollowup = (before.body.items || []).find((item) => item.estimateId === 'sla-estimate-1');
  const overdueInvoice = (before.body.items || []).find((item) => item.invoiceId === 'sla-invoice-1');
  const overdueRequest = (before.body.items || []).find((item) => item.requestId === 'REQ-sla-request-1');
  const freshRequest = (before.body.items || []).find((item) => item.requestId === 'REQ-sla-request-fresh');
  const urgentRequest = (before.body.items || []).find((item) => item.requestId === 'REQ-sla-request-urgent');
  const statusKey = 'sla-request-status-1';
  const requestStatus = await request('/api/requests/REQ-sla-request-fresh/status', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': statusKey }, body: JSON.stringify({ status: 'In progress' }) });
  const requestStatusDuplicate = await request('/api/requests/REQ-sla-request-fresh/status', { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': statusKey }, body: JSON.stringify({ status: 'In progress' }) });
  const status = await postJson('/api/leads/sla-lead-1/status', { status: 'Contacted', note: 'Called within the response workflow.' }, token);
  const enRoute = await postJson('/api/jobs/sla-job-1/status', { status: 'En route' }, token);
  const after = await request('/api/notifications', { headers });
  const afterDashboard = await request('/api/dashboard', { headers });
  const stillBreached = (after.body.items || []).some((item) => item.leadId === 'sla-lead-1' && item.title === 'Lead response SLA breached');
  const stillLeadAlert = (after.body.items || []).some((item) => item.leadId === 'sla-lead-1');
  const stillLateAppointment = (after.body.items || []).some((item) => item.jobId === 'sla-job-1' && item.title === 'Late appointment needs attention');
  if (assignmentUpdate.response.status !== 200 || assignmentUpdate.body.assignedTo !== 'Taylor Brooks' || assignmentUpdate.body.duplicate || assignmentDuplicate.response.status !== 200 || !assignmentDuplicate.body.duplicate || assignmentConflict.response.status !== 409 || assignmentConflict.body.error !== 'idempotency_key_reused' || requestStatus.response.status !== 200 || requestStatus.body.status !== 'In progress' || requestStatus.body.duplicate || requestStatusDuplicate.response.status !== 200 || !requestStatusDuplicate.body.duplicate || priorityUpdate.response.status !== 200 || priorityUpdate.body.priority !== 'High' || priorityUpdate.body.duplicate || priorityDuplicate.response.status !== 200 || !priorityDuplicate.body.duplicate || priorityConflict.response.status !== 409 || priorityConflict.body.error !== 'idempotency_key_reused' || before.response.status !== 200 || dashboard.response.status !== 200 || dashboard.body.metrics?.leadSlaBreaches !== '1' || dashboard.body.metrics?.lateAppointments !== '1' || dashboard.body.metrics?.estimatesAtRisk !== '1' || breached?.title !== 'Lead response SLA breached' || breached?.status !== 'Urgent' || lateAppointment?.title !== 'Late appointment needs attention' || lateAppointment?.status !== 'Urgent' || estimateFollowup?.title !== 'Estimate follow-up due' || estimateFollowup?.status !== 'Action needed' || overdueInvoice?.title !== 'Invoice overdue' || overdueInvoice?.status !== 'Urgent' || !overdueInvoice?.detail.includes('4d past due') || overdueRequest?.title !== 'Customer request overdue' || overdueRequest?.status !== 'Urgent' || !overdueRequest?.detail.includes('2d open') || freshRequest?.title !== 'Customer request needs response' || freshRequest?.status !== 'Action needed' || !freshRequest?.detail.includes('3h open') || urgentRequest?.title !== 'Customer request marked urgent' || urgentRequest?.status !== 'Urgent' || !urgentRequest?.detail.includes('Urgent') || status.response.status !== 200 || !status.body.lead?.firstResponseAt || enRoute.response.status !== 200 || enRoute.body?.status !== 'En route' || afterDashboard.body.metrics?.lateAppointments !== '0' || after.body.items.some((item) => item.requestId === 'REQ-sla-request-fresh') || stillBreached || stillLeadAlert || stillLateAppointment) throw new Error('lead response SLA behavior failed');
  console.log('Northstar lead SLA test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
