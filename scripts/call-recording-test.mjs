import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9100 + Math.floor(Math.random() * 500);
const secret = 'call-recording-test-secret-32-characters';
const dataFile = join(tmpdir(), `northstar-call-recording-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_CALL_WEBHOOK_SECRET: secret };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 300; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error('call recording test server did not start'); };
const signedWebhook = async (body) => { const raw = JSON.stringify(body); return post('/api/webhooks/calls/inbound', body, { 'x-northstar-signature': createHmac('sha256', secret).update(raw).digest('hex') }); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const ownerLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const ownerHeaders = { authorization: `Bearer ${ownerLogin.body.token}` };
  const eventId = randomUUID();
  const created = await signedWebhook({ eventId, tenantId: 'clearwater-plumbing', from: '843-555-0199', durationSeconds: 65, recordingUrl: 'https://recordings.example.test/call/abc', recordingExpiresAt: '2099-01-01T00:00:00.000Z' });
  const listed = await request('/api/calls', { headers: ownerHeaders });
  const call = listed.body.items?.find((item) => item.id === created.body.call?.id);
  const recording = await request(`/api/calls/${encodeURIComponent(created.body.call?.id)}/recording`, { headers: ownerHeaders });
  const invalid = await signedWebhook({ eventId: randomUUID(), tenantId: 'clearwater-plumbing', from: '843-555-0198', durationSeconds: 1, recordingUrl: 'http://recordings.example.test/call/nope' });
  const accountantLogin = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'accountant' });
  const accountantRecording = await request(`/api/calls/${encodeURIComponent(created.body.call?.id)}/recording`, { headers: { authorization: `Bearer ${accountantLogin.body.token}` } });
  if (!created.response.ok || !call?.recordingAvailable || Object.prototype.hasOwnProperty.call(call, 'recordingUrl') || recording.response.status !== 200 || recording.body.recording?.url !== 'https://recordings.example.test/call/abc' || invalid.response.status !== 422 || accountantRecording.response.status !== 403) throw new Error('call recording metadata, protected access, URL validation, or list redaction failed');
  console.log('Northstar call recording checks passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
