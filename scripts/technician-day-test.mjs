import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9800 + (process.pid % 300);
const dataFile = join(tmpdir(), `northstar-technician-day-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('technician day test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'day-customer', tenantId, name: 'Day Customer', phone: '843-555-0101', location: '1 Route Way' }], jobs: [{ id: 'JOB-DAY-1', tenantId, customerId: 'day-customer', customer: 'Day Customer', service: 'Drain service', technician: 'Alex Rivera', status: 'Confirmed', priority: 'High', time: 'Today 9:00 AM', startsAt, endsAt, location: '1 Route Way' }, { id: 'JOB-DAY-OTHER', tenantId, customerId: 'day-customer', customer: 'Other tech', service: 'Electrical service', technician: 'Marcus Thompson', status: 'Confirmed', time: 'Today 11:00 AM', startsAt, endsAt, location: '2 Route Way' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const link = await post('/api/jobs/JOB-DAY-1/technician-link', { technician: 'Alex Rivera' }, { authorization: `Bearer ${login.body.token}` });
  const token = new URL(link.body.url, base).searchParams.get('token');
  const day = await request(`/api/public/technician-day?token=${encodeURIComponent(token)}`);
  const invalid = await request(`/api/public/technician-day?token=${encodeURIComponent(token)}&date=bad`);
  const job = day.body.jobs?.[0];
  if (!login.response.ok || link.response.status !== 200 || day.response.status !== 200 || day.body.technician !== 'Alex Rivera' || day.body.jobs?.length !== 1 || job?.id !== 'JOB-DAY-1' || !job.url?.includes('/technician.html?token=') || Object.prototype.hasOwnProperty.call(job, 'phone') || invalid.response.status !== 422 || invalid.body.error !== 'valid_technician_date_required') throw new Error('technician day route was not tenant-safe, date-validated, or limited to assigned jobs');
  console.log('Northstar technician day route test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
