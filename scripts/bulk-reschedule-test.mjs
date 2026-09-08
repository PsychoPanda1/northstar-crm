import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 24500 + Math.floor(Math.random() * 500);
const dataFile = join(tmpdir(), `northstar-bulk-reschedule-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 300; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('bulk reschedule server did not start'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' }); assert(login.response.ok, 'bulk reschedule login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const customers = await request('/api/customers', { headers }); assert(customers.body.items?.length >= 2, 'bulk reschedule test needs two customers');
  const created = await Promise.all(customers.body.items.slice(0, 2).map((customer, index) => post('/api/jobs', { customerId: customer.id, service: `Bulk reschedule ${index + 1}`, time: `Tomorrow ${index + 8}:00 AM`, startsAt: `2030-01-15T${String(index + 8).padStart(2, '0')}:00:00.000Z`, endsAt: `2030-01-15T${String(index + 9).padStart(2, '0')}:00:00.000Z` }, headers)));
  assert(created.every((item) => item.response.status === 201), 'bulk reschedule jobs were not created');
  const availability = await request('/api/public/availability?service=plumbing&days=14'); assert(availability.body.slotOptions?.length >= 3, 'bulk reschedule needs three available slots');
  const jobIds = created.map((item) => item.body.id); const changes = [{ jobId: jobIds[0], slotId: availability.body.slotOptions[0].id }, { jobId: jobIds[1], slotId: availability.body.slotOptions[1].id }];
  const first = await post('/api/dispatch/bulk-reschedule', { changes }, { ...headers, 'idempotency-key': 'bulk-reschedule-1' });
  const duplicate = await post('/api/dispatch/bulk-reschedule', { changes }, { ...headers, 'idempotency-key': 'bulk-reschedule-1' });
  const conflict = await post('/api/dispatch/bulk-reschedule', { changes: [{ jobId: jobIds[0], slotId: availability.body.slotOptions[2].id }, { jobId: jobIds[1], slotId: availability.body.slotOptions[2].id }] }, { ...headers, 'idempotency-key': 'bulk-reschedule-conflict' });
  const messages = await request('/api/messages', { headers });
  assert(first.response.status === 200 && first.body.jobs?.length === 2 && first.body.jobs[0].slotId === changes[0].slotId && duplicate.response.status === 200 && duplicate.body.duplicate === true && conflict.response.status === 422 && conflict.body.error === 'valid_bulk_reschedule_required' && messages.body.items?.filter((item) => item.template === 'rescheduled' && jobIds.includes(item.jobId)).length === 2, 'bulk reschedule did not apply, deduplicate, reject duplicate slots, or notify customers safely');
  console.log('Northstar bulk reschedule test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
