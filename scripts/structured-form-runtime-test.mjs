import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6800 + Math.floor(Math.random() * 1000); const dataFile = join(tmpdir(), `northstar-structured-form-${process.pid}-${Date.now()}.json`); const tenantId = 'clearwater-plumbing';
const definition = { formName: 'Safety inspection', fields: [{ id: 'condition', label: 'Condition', type: 'select', required: true, options: ['Safe', 'Unsafe'] }, { id: 'hazard', label: 'Hazard note', type: 'text', required: true, showWhen: { fieldId: 'condition', equals: 'Unsafe' } }] };
writeFileSync(dataFile, JSON.stringify({ [tenantId]: { jobs: [{ id: 'structured-form-job', tenantId, customer: 'Test Customer', service: 'Electrical diagnostic', technician: 'Alex Rivera', status: 'Confirmed', time: 'Tomorrow 9:00 AM', requiredForms: [{ id: 'REQ-1', ...definition, required: true, completed: false }], checklist: [] }] } }));
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_CATALOG_JSON: JSON.stringify([{ tenantId, id: 'clearwater-safety-catalog', name: 'Safety inspection', description: 'Structured safety inspection workflow', priceFrom: '$125', durationMinutes: 60, formDefinitions: [definition] }]) }; const base = `http://127.0.0.1:${port}`; let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('structured form test server did not start'); };
try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' }); assert.equal(login.response.status, 200);
  const link = await post('/api/jobs/structured-form-job/technician-link', {}, { authorization: `Bearer ${login.body.token}` }); assert.equal(link.response.status, 200);
  const token = new URL(link.body.url, base).searchParams.get('token'); const path = `/api/public/technician-job/forms?token=${encodeURIComponent(token)}`;
  const listed = await request(path); assert.equal(listed.response.status, 200); assert.equal(listed.body.requiredForms[0].fields[0].id, 'condition');
  const missing = await post(path, { formName: 'Safety inspection', result: 'Pass', notes: 'Checked', answers: { condition: 'Unsafe' } }, { 'idempotency-key': 'structured-form-missing' }); assert.equal(missing.response.status, 422); assert.equal(missing.body.error, 'required_form_field_missing');
  const key = 'structured-form-submit'; const submitted = await post(path, { formName: 'Safety inspection', result: 'Needs follow-up', notes: 'Hazard documented.', answers: { condition: 'Unsafe', hazard: 'Loose conductor' } }, { 'idempotency-key': key }); assert.equal(submitted.response.status, 201); assert.equal(submitted.body.form.answers.hazard, 'Loose conductor');
  const duplicate = await post(path, { formName: 'Safety inspection', result: 'Needs follow-up', notes: 'Hazard documented.', answers: { condition: 'Unsafe', hazard: 'Loose conductor' } }, { 'idempotency-key': key }); assert.equal(duplicate.response.status, 200); assert.equal(duplicate.body.duplicate, true);
  const availability = await request('/api/public/availability?service=plumbing&catalogItemId=clearwater-safety-catalog'); assert.equal(availability.response.status, 200); assert.ok(availability.body.slotOptions.length > 0);
  const configuredBooking = await post('/api/public/bookings?service=plumbing', { name: 'Configured Catalog Customer', email: 'configured@example.com', location: '123 Main Street', catalogItemId: 'clearwater-safety-catalog', slotId: availability.body.slotOptions[0].id }, { 'idempotency-key': 'configured-form-booking' }); assert.equal(configuredBooking.response.status, 201);
  const configuredAssignment = await post('/api/dispatch/bulk-assign', { technician: 'Alex Rivera', jobIds: [configuredBooking.body.id] }, { authorization: `Bearer ${login.body.token}`, 'idempotency-key': 'configured-form-assignment' }); assert.equal(configuredAssignment.response.status, 200);
  const configuredLink = await post(`/api/jobs/${configuredBooking.body.id}/technician-link`, {}, { authorization: `Bearer ${login.body.token}` }); assert.equal(configuredLink.response.status, 200);
  const configuredToken = new URL(configuredLink.body.url, base).searchParams.get('token'); const configuredForms = await request(`/api/public/technician-job/forms?token=${encodeURIComponent(configuredToken)}`); assert.equal(configuredForms.response.status, 200); assert.equal(configuredForms.body.requiredForms[0].formName, 'Safety inspection'); assert.equal(configuredForms.body.requiredForms[0].fields[0].id, 'condition');
  console.log('Northstar structured form runtime test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
