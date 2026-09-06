import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5500 + Math.floor(Math.random() * 100);
const providerPort = port + 1;
const dataFile = join(tmpdir(), `northstar-document-automation-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const deliveryId = 'DOC-automation-1';
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_DOCUMENT_PROVIDER_URL: `http://127.0.0.1:${providerPort}`, NORTHSTAR_DOCUMENT_RETRY_LIMIT: '1', NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15' };
const base = `http://127.0.0.1:${port}`;
let child; let provider; let attempts = 0;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitFor = async (predicate) => { for (let attempt = 0; attempt < 200; attempt += 1) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('document automation state did not arrive'); };
const waitForServer = async () => waitFor(async () => { try { return (await fetch(`${base}/api/health`)).ok; } catch { return false; } });

try {
  provider = createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; attempts += 1; res.setHeader('content-type', 'application/json'); if (attempts === 1) { res.statusCode = 503; res.end(JSON.stringify({ error: 'temporary_provider_failure' })); return; } res.end(JSON.stringify({ id: 'provider-document-automation-1' })); });
  await new Promise((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { documentDeliveries: [{ id: deliveryId, tenantId, documentType: 'invoice', documentId: 'INV-automation-1', customerId: 'customer-automation-1', customer: 'Automation Customer', artifactUrl: 'https://crm.example/invoice', pdfUrl: 'https://crm.example/invoice.pdf', status: 'Pending provider', queuedAt: new Date().toISOString(), attempt: 0 }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  await waitFor(() => { try { return JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].documentDeliveries[0].status === 'Retry scheduled'; } catch { return false; } });
  const afterFirstAttempt = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].documentDeliveries[0];
  const saved = JSON.parse(readFileSync(dataFile, 'utf8')); saved[tenantId].documentDeliveries[0].nextRetryAt = new Date(Date.now() - 1000).toISOString(); writeFileSync(dataFile, JSON.stringify(saved));
  child.kill(); await new Promise((resolve) => child.once('exit', resolve)); child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' }); await waitForServer();
  await waitFor(() => { try { return JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].documentDeliveries[0].status === 'Delivered'; } catch { return false; } });
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  const finalDelivery = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].documentDeliveries[0];
  if (!login.response.ok || afterFirstAttempt.status !== 'Retry scheduled' || afterFirstAttempt.attempt !== 1 || finalDelivery.status !== 'Delivered' || finalDelivery.attempt !== 1 || attempts !== 2 || finalDelivery.providerReference !== 'provider-document-automation-1') throw new Error('scheduled document retry recovery failed');
  console.log('Northstar document provider automation test passed');
} finally { if (child && !child.killed) child.kill(); if (provider) await new Promise((resolve) => provider.close(resolve)); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
