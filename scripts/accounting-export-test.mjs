import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4394;
const base = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), 'northstar-accounting-'));
const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), NORTHSTAR_DATA_FILE: join(tempDir, 'state.json'), NORTHSTAR_SESSION_SECRET: 'accounting-export-test-secret-32-characters', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true' }, stdio: 'ignore' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); if (attempt === 99) throw new Error('server did not start'); }
  const login = await fetch(`${base}/api/auth/demo-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  const loginBody = await login.json();
  assert(login.ok && loginBody.token, 'demo owner login failed');
  const headers = { authorization: `Bearer ${loginBody.token}` };
  const invalid = await fetch(`${base}/api/export?type=accounting&startDate=not-a-date`, { headers });
  assert(invalid.status === 422, 'invalid accounting date range was accepted');
  const exportResponse = await fetch(`${base}/api/export?type=accounting&startDate=2020-01-01&endDate=2099-12-31`, { headers });
  const csv = await exportResponse.text();
  assert(exportResponse.ok && csv.includes('recordType') && exportResponse.headers.get('content-type')?.includes('text/csv'), 'accounting CSV export failed');
  console.log('Northstar accounting export test passed');
} finally {
  server.kill();
  rmSync(tempDir, { recursive: true, force: true });
}
