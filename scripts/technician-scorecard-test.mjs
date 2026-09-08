import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6900 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-technician-scorecard-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const now = new Date().toISOString();
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('technician scorecard test server did not start'); };

try {
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { jobs: [{ id: 'JOB-SCORE-1', tenantId, customer: 'Scorecard Customer', service: 'Water heater repair', technician: 'Alex Rivera', status: 'Completed', completedAt: now, fieldMinutes: 90 } , { id: 'JOB-SCORE-2', tenantId, customer: 'Scorecard Customer', service: 'Drain cleaning', technician: 'Jordan Lee', status: 'No-show', updatedAt: now }], invoices: [{ id: 'INV-SCORE-1', tenantId, jobId: 'JOB-SCORE-1', amount: 1000, status: 'Paid' }], laborEntries: [{ id: 'LAB-SCORE-1', tenantId, jobId: 'JOB-SCORE-1', technician: 'Alex Rivera', hours: 1.5, hourlyRate: 100, cost: 150 }] } }));
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const scorecards = await request('/api/reports/technician-scorecards', { headers: { authorization: `Bearer ${login.body.token}` } });
  const alex = scorecards.body.scorecards?.find((item) => item.technician === 'Alex Rivera');
  const jordan = scorecards.body.scorecards?.find((item) => item.technician === 'Jordan Lee');
  if (!login.response.ok || scorecards.response.status !== 200 || !alex || alex.completed !== 1 || alex.completionRate !== 100 || alex.grade !== 'A' || alex.score <= 80 || !jordan || jordan.noShows !== 1 || jordan.completionRate !== 0 || jordan.score >= alex.score) throw new Error('technician scorecards did not derive tenant-scoped performance metrics');
  const persisted = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (!persisted[tenantId].jobs?.length) throw new Error('scorecard read unexpectedly mutated operational data');
  console.log('Northstar technician scorecard test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
