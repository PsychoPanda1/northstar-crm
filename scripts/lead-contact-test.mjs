import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4900 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-contact-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead contact test server did not start'); };
const postJson = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const lead = await postJson('/api/public/leads?service=plumbing', { name: 'Lead Contact Test', phone: '843-555-0173', source: 'Contact test' });
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!lead.response.ok || !login.response.ok) throw new Error('lead contact test setup failed');
  const token = login.body.token;
  const manualHeaders = { authorization: `Bearer ${token}`, 'idempotency-key': 'manual-lead-contract-key' };
  const manualPayload = { name: 'Manual Lead Contract', phone: '843-555-0291', email: 'manual@example.com', service: 'Water heater repair', source: 'Phone call', location: '2 Contract Way', note: 'Needs same-day callback', utm_campaign: 'manual-contract' };
  const manual = await postJson('/api/leads', manualPayload, manualHeaders);
  const manualDuplicate = await postJson('/api/leads', manualPayload, manualHeaders);
  const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'lead-contact-test-key' };
  const contact = await postJson(`/api/leads/${lead.body.id}/contact`, { channel: 'SMS', message: 'A quick follow-up from the service team.' }, headers);
  const duplicate = await postJson(`/api/leads/${lead.body.id}/contact`, { channel: 'SMS', message: 'A quick follow-up from the service team.' }, headers);
  const existingCustomer = await postJson('/api/customers', { name: 'Existing Customer Identity', phone: manualPayload.phone, email: 'existing@example.com', location: '3 Contract Way' }, { authorization: `Bearer ${token}` });
  const locationLead = await postJson('/api/public/leads?service=plumbing', { name: 'Location Carryover Lead', email: 'location-carryover@example.com', source: 'Landing page', location: '44 Carryover Avenue' }, { 'idempotency-key': 'location-carryover-lead-key' });
  const availability = await request('/api/public/availability?service=plumbing&days=14');
  const slot = availability.body.slotOptions?.[0];
  const locationSlot = availability.body.slotOptions?.[1] || slot;
  const conversion = slot ? await postJson(`/api/leads/${manual.body.lead?.id}/convert`, { time: slot.label, slotId: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt }, { authorization: `Bearer ${token}`, 'idempotency-key': 'manual-lead-conversion-key' }) : { response: { status: 0 }, body: {} };
  const locationConversion = locationSlot ? await postJson(`/api/leads/${locationLead.body.id}/convert`, { time: locationSlot.label, slotId: locationSlot.id, startsAt: locationSlot.startsAt, endsAt: locationSlot.endsAt }, { authorization: `Bearer ${token}`, 'idempotency-key': 'location-lead-conversion-key' }) : { response: { status: 0 }, body: {} };
  const messages = await request('/api/messages', { headers: { authorization: `Bearer ${token}` } });
  const queued = (messages.body.items || []).find((item) => item.leadId === lead.body.id);
  const stageHistory = contact.body.lead?.stageHistory || [];
  if (manual.response.status !== 201 || manual.body.lead?.phone !== manualPayload.phone || manual.body.lead?.location !== '2 Contract Way' || manual.body.lead?.attribution?.utm_campaign !== 'manual-contract' || manualDuplicate.response.status !== 200 || !manualDuplicate.body.duplicate || contact.response.status !== 201 || contact.body.lead?.status !== 'Contacted' || stageHistory.length < 2 || stageHistory.at(-2)?.to !== 'New' || stageHistory.at(-1)?.to !== 'Contacted' || stageHistory.at(-1)?.actor !== 'workflow' || duplicate.response.status !== 200 || !duplicate.body.duplicate || queued?.status !== 'Queued (provider pending)' || existingCustomer.response.status !== 201 || conversion.response.status !== 201 || conversion.body.customer?.id !== existingCustomer.body.id || conversion.body.job?.customerId !== existingCustomer.body.id || locationLead.response.status !== 201 || locationConversion.response.status !== 201 || locationConversion.body.customer?.location !== '44 Carryover Avenue' || locationConversion.body.job?.location !== '44 Carryover Avenue') throw new Error('manual lead enrichment, contact queue, stage history, idempotency, conversion identity, or location carryover failed');
  console.log('Northstar lead contact test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
