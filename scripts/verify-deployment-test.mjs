import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 7400 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-deployment-verifier-${process.pid}-${Date.now()}.json`);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions`, NORTHSTAR_SESSION_SECRET: 'deployment-verifier-session-secret-32-characters', NORTHSTAR_OWNER_EMAIL: 'owner@example.com', NORTHSTAR_OWNER_PASSWORD_DIGEST: 'a'.repeat(64), NORTHSTAR_PAYMENT_WEBHOOK_SECRET: 'a'.repeat(32), NORTHSTAR_MESSAGE_WEBHOOK_SECRET: 'b'.repeat(32), NORTHSTAR_CALL_WEBHOOK_SECRET: 'c'.repeat(32), NORTHSTAR_FINANCING_WEBHOOK_SECRET: 'd'.repeat(32) }, stdio: 'ignore' });
try {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (attempt === 199) throw new Error('deployment verifier test server did not start');
  }
  const result = await new Promise((resolve, reject) => {
    const verifier = spawn(process.execPath, ['scripts/verify-deployment.mjs'], { cwd: root, env: { ...process.env, NORTHSTAR_DEPLOYMENT_URL: base, NORTHSTAR_DEPLOYMENT_ALLOW_HTTP: 'true', NORTHSTAR_DEPLOYMENT_SERVICE: 'plumbing' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    verifier.stdout.on('data', (chunk) => { stdout += chunk; });
    verifier.stderr.on('data', (chunk) => { stderr += chunk; });
    verifier.on('error', reject);
    verifier.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /public catalog: ready/);
  assert.match(result.stdout, /public availability: ready/);
  console.log('Northstar deployment verifier contract test passed');
} finally {
  child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
