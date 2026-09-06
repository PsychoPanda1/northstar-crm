import { existsSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6000 + Math.floor(Math.random() * 100);
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-operations-metrics-'));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_FILE: join(tempDir, 'sessions.json') };
const base = `http://127.0.0.1:${port}`;
let child;
const post = async (path, body) => { const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { response, body: await response.json().catch(() => ({})) }; };
const get = async (path, token) => { const response = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } }); return { response, body: await response.json().catch(() => ({})) }; };
try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('operations metrics server did not start'); }
  const owner = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const technician = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'technician' });
  const electricOwner = await post('/api/auth/demo-login?service=electrician', { service: 'electrician', role: 'owner' });
  const metrics = await get('/api/operations/metrics', owner.body.token);
  const technicianMetrics = await get('/api/operations/metrics', technician.body.token);
  const otherTenantMetrics = await get('/api/operations/metrics', electricOwner.body.token);
  const serialized = JSON.stringify(metrics.body);
  if (!owner.response.ok || !technician.response.ok || !electricOwner.response.ok || metrics.response.status !== 200 || metrics.body.tenantId !== 'clearwater-plumbing' || !metrics.body.process?.storage || !Number.isInteger(metrics.body.process?.uptimeSeconds) || metrics.body.persistence?.integrityHealthy !== true || metrics.body.persistence?.backup === undefined || metrics.body.records?.customers === undefined || metrics.body.queues?.accounting === undefined || technicianMetrics.response.status !== 403 || otherTenantMetrics.response.status !== 200 || otherTenantMetrics.body.tenantId === metrics.body.tenantId || serialized.includes('843-') || serialized.includes('@')) throw new Error('operational metrics authorization, isolation, or redaction contract failed');
  console.log('Northstar operational metrics test passed');
} finally { if (child && !child.killed) child.kill(); if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true }); }
