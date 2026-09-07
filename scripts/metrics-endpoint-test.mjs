import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7600 + Math.floor(Math.random() * 200);
const dataFile = join(tmpdir(), `northstar-metrics-${process.pid}-${Date.now()}.json`);
const secret = 'northstar-metrics-test-secret-32-characters';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_METRICS_SECRET: secret }, stdio: 'ignore' });
try {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (attempt === 199) throw new Error('metrics test server did not start');
  }
  const unauthorized = await fetch(`${base}/api/metrics`);
  assert.equal(unauthorized.status, 401);
  const response = await fetch(`${base}/api/metrics`, { headers: { authorization: `Bearer ${secret}` } });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/plain/);
  assert.match(body, /northstar_up 1/);
  assert.match(body, /northstar_records\{tenant="johnson-service-co",record="customers"\}/);
  assert.doesNotMatch(body, /Contact pending|@|843-/);
  console.log('Northstar external metrics endpoint test passed');
} finally {
  child.kill();
  if (child.exitCode === null) await new Promise((resolve) => child.once('exit', resolve));
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true });
}
