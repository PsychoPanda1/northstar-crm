import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 9950 + Math.floor(Math.random() * 30);
const providerPort = 9980 + Math.floor(Math.random() * 30);
const dataFile = join(tmpdir(), `northstar-payroll-provider-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
const received = [];
let attempts = 0;
const provider = createServer((req, res) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => { attempts += 1; if (attempts === 1) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'temporary payroll outage' })); return; } received.push({ headers: req.headers, body: JSON.parse(raw || '{}') }); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: `payroll-${received.length}`, status: 'accepted' })); }); });
const listen = (server, portNumber) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(portNumber, '127.0.0.1', resolve); });
const data = { [tenantId]: { payrollRuns: [{ id: 'PAY-provider-1', tenantId, status: 'Approved', period: '2026-09-01 to 2026-09-30', startDate: '2026-09-01', endDate: '2026-09-30', totals: { completedJobs: 2, fieldHours: 12, laborCost: 300, commissionableRevenue: 1200, commissionDue: 120 }, technicians: [{ technician: 'Alex Rivera', completedJobs: 2, fieldHours: 12, laborCost: 300, commissionableRevenue: 1200, commissionRate: 10, commissionDue: 120 }] }] } };
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_PAYROLL_PROVIDER_URL: `http://127.0.0.1:${providerPort}/payroll`, NORTHSTAR_PAYROLL_PROVIDER_API_KEY: 'payroll-test-key', NORTHSTAR_PAYROLL_RETRY_LIMIT: '1', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
try {
  writeFileSync(dataFile, JSON.stringify(data));
  await listen(provider, providerPort);
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 199) throw new Error('payroll provider test server did not start'); }
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('payroll provider test login failed');
  const headers = { authorization: `Bearer ${login.body.token}` };
  const dispatch = await post('/api/integrations/payroll/dispatch', { limit: 10 }, headers);
  const retry = await post('/api/integrations/payroll/retry', { payrollRunId: 'PAY-provider-1' }, headers);
  const retryDispatch = await post('/api/integrations/payroll/dispatch', { limit: 10 }, headers);
  const duplicate = await post('/api/integrations/payroll/dispatch', { limit: 10 }, headers);
  const health = await request('/api/integrations/health', { headers });
  const saved = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId];
  const run = saved.payrollRuns?.[0];
  if (dispatch.response.status !== 200 || dispatch.body.retrying !== 1 || retry.response.status !== 200 || retryDispatch.body.delivered !== 1 || duplicate.body.attempted !== 0 || received.length !== 1 || received[0].headers.authorization !== 'Bearer payroll-test-key' || received[0].headers['idempotency-key'] !== 'PAY-provider-1' || run.providerSyncState !== 'Delivered' || health.body.checks?.payrollProvider !== true || health.body.payroll?.pending !== 0) throw new Error('payroll provider delivery or health contract failed');
  console.log('Northstar payroll provider test passed');
} finally { if (child && !child.killed) child.kill(); provider.close(); for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true }); }
