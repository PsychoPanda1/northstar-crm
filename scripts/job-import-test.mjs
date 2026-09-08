import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4960 + Math.floor(Math.random() * 60);
const dataFile = join(tmpdir(), `northstar-job-import-${process.pid}-${Date.now()}.json`);
const sessionFile = `${dataFile}.sessions`;
const base = `http://127.0.0.1:${port}`;
writeFileSync(dataFile, JSON.stringify({ 'clearwater-plumbing': { customers: [{ id: 'import-customer', tenantId: 'clearwater-plumbing', name: 'Import Customer', phone: '843-555-0177', location: '1 Import Way' }], teamMembers: [{ id: 'import-tech', tenantId: 'clearwater-plumbing', name: 'Alex Rivera', role: 'Field technician', skills: ['Plumbing'] }], jobs: [] } }));
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('job import server did not start'); };
const rows = [{ externalId: 'legacy-job-1', customerPhone: '(843) 555-0177', service: 'Drain cleaning', time: '2026-08-14 09:00 AM', status: 'Completed', priority: 'Normal', technician: 'Alex Rivera', completionNote: 'Imported historical closeout.' }, { externalId: 'legacy-job-2', customerName: 'Missing Customer', service: 'Unknown service', time: '2026-08-15 10:00 AM', status: 'Completed' }];
try {
  await waitForServer();
  const login = await request('/api/auth/demo-login?service=plumbing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'plumbing' }) });
  const auth = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
  const preview = await request('/api/jobs/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'job-import-preview' }, body: JSON.stringify({ jobs: rows, dryRun: true }) });
  const imported = await request('/api/jobs/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'job-import-run' }, body: JSON.stringify({ jobs: rows }) });
  const duplicate = await request('/api/jobs/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'job-import-run' }, body: JSON.stringify({ jobs: rows }) });
  const conflict = await request('/api/jobs/import', { method: 'POST', headers: { ...auth, 'idempotency-key': 'job-import-run' }, body: JSON.stringify({ jobs: [{ ...rows[0], service: 'Different service' }] }) });
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'))['clearwater-plumbing'];
  if (!login.response.ok || preview.response.status !== 200 || preview.body.dryRun !== true || preview.body.created !== 1 || preview.body.invalid !== 1 || imported.response.status !== 201 || imported.body.created !== 1 || imported.body.invalid !== 1 || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || persisted.jobs?.length !== 1 || persisted.jobs[0].importExternalId !== 'legacy-job-1' || persisted.jobs[0].customerId !== 'import-customer' || persisted.jobs[0].status !== 'Completed' || persisted.jobImportRuns?.length !== 1) throw new Error('job import validation, customer matching, idempotency, or persistence contract failed');
  console.log('Northstar job import test passed');
} finally {
  child.kill();
  for (const file of [dataFile, sessionFile, `${dataFile}.tmp`, `${sessionFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
