import { existsSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6200 + Math.floor(Math.random() * 100);
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-analytics-history-'));
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_FILE: join(tempDir, 'sessions.json') };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('analytics history server did not start'); }
  const owner = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const technician = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'technician' });
  const otherOwner = await post('/api/auth/demo-login?service=electrician', { service: 'electrician', role: 'owner' });
  const ownerHeaders = { authorization: `Bearer ${owner.body.token}` };
  const technicianHeaders = { authorization: `Bearer ${technician.body.token}` };
  const otherHeaders = { authorization: `Bearer ${otherOwner.body.token}` };
  const empty = await request('/api/reports/analytics-history?days=30', { headers: ownerHeaders });
  const captured = await request('/api/reports/analytics-snapshot', { method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/json' }, body: '{}' });
  const duplicate = await request('/api/reports/analytics-snapshot', { method: 'POST', headers: { ...ownerHeaders, 'content-type': 'application/json' }, body: '{}' });
  const history = await request('/api/reports/analytics-history?days=30', { headers: ownerHeaders });
  const technicianHistory = await request('/api/reports/analytics-history', { headers: technicianHeaders });
  const otherHistory = await request('/api/reports/analytics-history', { headers: otherHeaders });
  if (!owner.response.ok || !technician.response.ok || !otherOwner.response.ok || empty.response.status !== 200 || empty.body.snapshots?.length !== 0 || captured.response.status !== 200 || !captured.body.snapshot?.id || !captured.body.snapshot?.metrics?.['Cash collected'] || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || history.response.status !== 200 || history.body.snapshots?.length !== 1 || technicianHistory.response.status !== 403 || otherHistory.response.status !== 200 || otherHistory.body.snapshots?.length !== 0) throw new Error('analytics history authorization, idempotency, persistence, or tenant isolation failed');
  console.log('Northstar analytics history test passed');
} finally { if (child && !child.killed) child.kill(); if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true }); }
