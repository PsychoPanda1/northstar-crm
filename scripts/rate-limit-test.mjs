import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4700 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-rate-limit-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_PUBLIC_LEAD_RATE_LIMIT: '2', NORTHSTAR_PUBLIC_MUTATION_RATE_LIMIT: '3' };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const cleanup = () => { child.kill(); for (const file of [dataFile, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) unlinkSync(file); };
const submit = async (service, suffix) => fetch(`${base}/api/public/leads?service=${service}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service, name: `Rate limit ${suffix}`, email: `rate-${suffix}@example.test`, phone: `843555${String(suffix).padStart(4, '0')}` }) });

try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const first = await submit('plumbing', 1);
  const second = await submit('plumbing', 2);
  const blocked = await submit('plumbing', 3);
  const isolated = await submit('powerwashing', 4);
  if (first.status !== 201 || second.status !== 201 || blocked.status !== 429 || blocked.headers.get('retry-after') !== '60' || isolated.status !== 201) throw new Error(`rate limit contract failed: ${first.status}/${second.status}/${blocked.status}/${isolated.status}`);
  console.log('Northstar public rate-limit test passed');
} finally {
  cleanup();
}
