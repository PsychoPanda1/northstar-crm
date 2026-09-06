import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5800 + Math.floor(Math.random() * 100);
const providerPort = 5900 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-accounting-automation-${process.pid}-${Date.now()}.json`);
const tenantId = 'clearwater-plumbing';
let received = 0;
const provider = createServer((req, res) => { req.resume(); req.on('end', () => { received += 1; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'scheduled-erp-1', status: 'accepted' })); }); });
const listen = (server, portNumber) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(portNumber, '127.0.0.1', resolve); });
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_AUTOMATION_INTERVAL_MINUTES: '15', NORTHSTAR_ACCOUNTING_PROVIDER_URL: `http://127.0.0.1:${providerPort}/erp`, PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const waitForServer = async (base) => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('accounting automation test server did not start'); };

try {
  const now = new Date().toISOString();
  writeFileSync(dataFile, JSON.stringify({ [tenantId]: { invoices: [{ id: 'invoice-scheduled-1', tenantId, customer: 'Scheduled Customer', amount: 125, paidAmount: 0, balance: 125, status: 'Due', due: '2026-09-10', createdAt: now }] } }));
  await listen(provider, providerPort);
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  await waitForServer(base);
  let sync = [];
  for (let attempt = 0; attempt < 100; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 50)); try { sync = JSON.parse(readFileSync(dataFile, 'utf8'))[tenantId].accountingSync || []; } catch {} if (sync.some((item) => item.syncState === 'Delivered')) break; }
  child.kill();
  if (received !== 1 || sync.length !== 1 || sync[0].key !== 'invoice:invoice-scheduled-1' || sync[0].syncState !== 'Delivered') throw new Error('scheduled accounting provider dispatch contract failed');
  console.log('Northstar scheduled accounting provider test passed');
} finally {
  provider.close();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
