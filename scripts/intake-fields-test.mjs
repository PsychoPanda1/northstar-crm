import { existsSync, unlinkSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-intake-${suffix}.json`);
const sessionFile = `${dataFile}.sessions`;
const port = 5800 + Math.floor(Math.random() * 100);
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
let child;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const cleanup = async () => { if (child) { child.kill(); await new Promise((resolve) => { const timer = setTimeout(resolve, 500); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); if (child.exitCode === null && process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} } } for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) { try { unlinkSync(file); } catch {} } };
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('intake fields test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const manifest = await request('/api/public/tenant?service=plumbing');
  assert(manifest.response.ok && manifest.body.tenant?.intakeFields?.some((field) => field.id === 'issue_type' && field.required), 'plumbing manifest did not expose required guided intake');
  const availability = await request('/api/public/availability?service=plumbing&days=7');
  const slot = availability.body.slotOptions?.[0];
  assert(slot, 'intake fields test did not receive an appointment slot');
  const invalid = await request('/api/public/bookings?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Guided Intake Customer', phone: '843-555-0412', location: '12 Intake Lane', requestedService: 'Leak repair', time: slot.label, slotId: slot.id, intakeAnswers: { urgency: 'Today' } }) });
  assert(invalid.response.status === 422 && invalid.body.error === 'required_intake_answer_missing' && invalid.body.fieldId === 'issue_type', 'missing required intake answer was not rejected');
  const booked = await request('/api/public/bookings?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `intake-${suffix}` }, body: JSON.stringify({ name: 'Guided Intake Customer', phone: '843-555-0412', location: '12 Intake Lane', requestedService: 'Leak repair', time: slot.label, slotId: slot.id, intakeAnswers: { issue_type: 'Leak', urgency: 'Today' } }) });
  assert(booked.response.status === 201 && booked.body.id, 'valid guided intake booking failed');
  const login = await request('/api/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const detail = await request(`/api/jobs/${encodeURIComponent(booked.body.id)}`, { headers: { authorization: `Bearer ${login.body.token}` } });
  assert(detail.response.ok && detail.body.job?.intakeAnswers?.issue_type === 'Leak' && detail.body.job?.intakeAnswers?.urgency === 'Today', 'guided intake answers were not retained on the job');
  console.log('Northstar guided intake fields test passed');
} finally { await cleanup(); }
