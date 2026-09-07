import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 15000 + (process.pid % 500);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-media-provider-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_MEDIA_PROVIDER_URL: `http://127.0.0.1:${providerPort + 1}`, NORTHSTAR_TENANT_PROVIDER_CONFIG_JSON: JSON.stringify({ [tenantId]: { media: { url: `http://127.0.0.1:${providerPort}`, apiKey: 'tenant-media-key' } } }) };
const base = `http://127.0.0.1:${port}`;
let child; let provider; const received = [];
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('media provider test server did not start'); };

try {
  provider = createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ uploadUrl: 'https://uploads.example.test/signed/object', mediaUrl: 'https://cdn.example.test/object.jpg', expiresAt: '2099-01-01T00:00:00.000Z' })); });
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { customers: [{ id: 'media-customer', tenantId, name: 'Media Customer', phone: '843-555-0188' }], jobs: [{ id: 'JOB-MEDIA-1', tenantId, customerId: 'media-customer', customer: 'Media Customer', service: 'Plumbing', technician: 'Alex Rivera', status: 'En route', time: 'Today 10:00 AM', location: '1 Media Way' }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' }); const auth = { authorization: `Bearer ${login.body.token}` };
  const link = await post('/api/jobs/JOB-MEDIA-1/technician-link', { technician: 'Alex Rivera' }, auth); const token = new URL(link.body.url, base).searchParams.get('token');
  const upload = await post(`/api/public/technician-job/media-upload?token=${encodeURIComponent(token)}`, { filename: 'before photo.jpg', contentType: 'image/jpeg', sizeBytes: 2048 }, { 'idempotency-key': 'media-upload-1' });
  const health = await request('/api/integrations/health', { headers: auth }); const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  if (!login.response.ok || !link.response.ok || upload.response.status !== 200 || upload.body.upload?.method !== 'PUT' || upload.body.upload?.uploadUrl !== 'https://uploads.example.test/signed/object' || upload.body.upload?.mediaUrl !== 'https://cdn.example.test/object.jpg' || upload.body.upload?.contentType !== 'image/jpeg' || upload.body.idempotencyKey !== 'media-upload-1' || received.length !== 1 || received[0].headers.authorization !== 'Bearer tenant-media-key' || received[0].body.action !== 'create_upload' || !String(received[0].body.objectKey).startsWith(`${tenantId}/`) && !String(received[0].body.objectKey).startsWith(`tenants/${tenantId}/`) || health.body.checks?.mediaProvider !== true || health.body.media?.storageMode !== 'managed-provider' || persisted.jobs[0].photos?.length) throw new Error('tenant media provider handoff or field-media safety failed');
  console.log('Northstar media provider test passed');
} finally { if (child && !child.killed) child.kill(); if (provider) await new Promise((resolve) => provider.close(resolve)); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
