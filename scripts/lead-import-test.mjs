import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 0;
const dataFile = join(tmpdir(), `northstar-lead-import-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
let base = '';
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { leads: [], leadImportRuns: [] } }));
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile }, stdio: ['ignore', 'pipe', 'ignore'] });
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { let output = ''; child.stdout.on('data', (chunk) => { output += chunk.toString(); const match = output.match(/http:\/\/localhost:(\d+)/); if (match) base = `http://127.0.0.1:${match[1]}`; }); for (let attempt = 0; attempt < 200; attempt += 1) { try { if (base && (await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead import server did not start'); };
const rows = [{ externalId: 'legacy-lead-1', name: 'Historical Customer', email: 'history@example.test', service: 'Drain cleaning', source: 'Google Ads', status: 'Qualified', receivedAt: '2026-08-01T12:00:00Z', utm_campaign: 'summer-drains' }, { externalId: 'legacy-lead-2', name: '', source: 'Referral' }, { externalId: 'legacy-lead-3', name: 'Bad Stage', source: 'Website', status: 'Unknown' }];
try {
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  const auth = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const preview = await request('/api/leads/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'lead-import-preview' }, body: JSON.stringify({ leads: rows, dryRun: true }) });
  const imported = await request('/api/leads/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'lead-import-run' }, body: JSON.stringify({ leads: rows }) });
  const duplicate = await request('/api/leads/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'lead-import-run' }, body: JSON.stringify({ leads: rows }) });
  const conflict = await request('/api/leads/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'lead-import-run' }, body: JSON.stringify({ leads: [{ ...rows[0], source: 'Changed source' }] }) });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (!login.response.ok || preview.response.status !== 200 || preview.body.created !== 1 || preview.body.invalid !== 2 || imported.response.status !== 201 || imported.body.created !== 1 || imported.body.invalid !== 2 || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || persisted.leads?.length !== 1 || persisted.leads[0].importExternalId !== 'legacy-lead-1' || persisted.leads[0].attribution?.utm_campaign !== 'summer-drains' || persisted.leadImportRuns?.length !== 1) throw new Error('lead import validation, attribution, idempotency, or persistence contract failed');
  console.log('Northstar lead import test passed');
} finally { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); }
