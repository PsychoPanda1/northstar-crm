import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 30000 + Math.floor(Math.random() * 20000);
const dataFile = join(tmpdir(), `northstar-retention-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const tenantId = 'clearwater-plumbing';
const old = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString();
const data = { [tenantId]: { customers: [{ id: 'retention-customer-1', tenantId, name: 'Retention Customer', phone: '843-555-0101', location: '1 Retention Way' }], activities: [{ id: 'retention-old-1', tenantId, customer: 'Retention Customer', note: 'Old activity', at: old }], messages: [], auditEvents: [] } };
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
try {
  writeFileSync(dataFile, JSON.stringify(data));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('retention server did not start'); }
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'owner' }) });
  if (!login.response.ok) throw new Error('retention owner login failed');
  const ownerHeaders = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const initial = await request('/api/reports/data-retention', { headers: ownerHeaders });
  const initialActivities = initial.body.collections?.find((item) => item.collection === 'activities');
  const update = await request('/api/settings/workspace', { method: 'PATCH', headers: { ...ownerHeaders, 'idempotency-key': 'retention-settings-1' }, body: JSON.stringify({ dataRetentionDays: 30 }) });
  const configured = await request('/api/reports/data-retention', { headers: ownerHeaders }); const manifest = await request('/api/public/tenant?service=plumbing'); const archive = await request('/api/reports/data-retention/archive', { method: 'POST', headers: { ...ownerHeaders, 'idempotency-key': 'retention-archive-1' }, body: JSON.stringify({ collection: 'activities', ids: ['retention-old-1'], confirmation: 'ARCHIVE' }) }); const archivedReport = await request('/api/reports/data-retention', { headers: ownerHeaders }); const archiveId = archive.body.archived?.[0]?.archiveId; const restore = await request('/api/reports/data-retention/restore', { method: 'POST', headers: { ...ownerHeaders, 'idempotency-key': 'retention-restore-1' }, body: JSON.stringify({ archiveIds: [archiveId], confirmation: 'RESTORE' }) }); const restoredReport = await request('/api/reports/data-retention', { headers: ownerHeaders });
  const dispatcherLogin = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing', role: 'dispatcher' }) });
  const dispatcher = await request('/api/reports/data-retention', { headers: { authorization: `Bearer ${dispatcherLogin.body.token}` } });
  if (initial.response.status !== 200 || initial.body.policy?.mode !== 'review_only' || !initialActivities?.candidateIds?.includes('retention-old-1') || update.response.status !== 200 || update.body.workspace?.dataRetentionDays !== 30 || configured.body.policy?.retentionDays !== 30 || dispatcher.response.status !== 403 || manifest.body.tenant?.dataRetentionDays !== undefined || archive.response.status !== 200 || !archiveId || archivedReport.body.candidateRecords !== 0 || archivedReport.body.archivedRecords !== 1 || restore.response.status !== 200 || restoredReport.body.candidateRecords !== 1 || restoredReport.body.archivedRecords !== 0) throw new Error('data retention contract failed');
  console.log('Northstar data retention test passed');
} finally { if (child && !child.killed) child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
