import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6100 + Math.floor(Math.random() * 1500);
const dataFile = join(tmpdir(), `northstar-rate-limit-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_PUBLIC_LEAD_RATE_LIMIT: '2', NORTHSTAR_PUBLIC_MUTATION_RATE_LIMIT: '3', NORTHSTAR_TRUST_PROXY: 'true' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const cleanup = () => { child.kill(); for (const file of [dataFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) unlinkSync(file); };
const submit = async (service, suffix, forwardedFor) => fetch(`${base}/api/public/leads?service=${service}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor }, body: JSON.stringify({ service, name: `Rate limit ${suffix}`, email: `rate-${suffix}@example.test`, phone: `843555${String(suffix).padStart(4, '0')}` }) });

try {
  let ready = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!ready) throw new Error('rate limit test server did not start');
  const first = await submit('plumbing', 1, '203.0.113.10');
  const second = await submit('plumbing', 2, '203.0.113.10');
  const blocked = await submit('plumbing', 3, '203.0.113.10');
  const isolated = await submit('plumbing', 4, '203.0.113.11');
  if (first.status !== 201 || second.status !== 201 || blocked.status !== 429 || blocked.headers.get('retry-after') !== '60' || isolated.status !== 201) throw new Error(`rate limit contract failed: ${first.status}/${second.status}/${blocked.status}/${isolated.status}`);
  console.log('Northstar public rate-limit test passed');
} finally {
  cleanup();
}
