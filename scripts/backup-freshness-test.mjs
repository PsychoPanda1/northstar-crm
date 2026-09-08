import { existsSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataFile = join(tmpdir(), `northstar-backup-freshness-${process.pid}-${Date.now()}.json`);
const backupFile = `${dataFile}.backup`;
const sessionFile = `${dataFile}.sessions`;
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'production', PORT: '0', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_BACKUP_FILE: backupFile, NORTHSTAR_SESSION_FILE: sessionFile, NORTHSTAR_BACKUP_MAX_AGE_HOURS: '1' }, stdio: ['ignore', 'pipe', 'ignore'] });
let base = '';
const waitForServer = async () => { let output = ''; child.stdout.on('data', (chunk) => { output += chunk.toString(); const match = output.match(/http:\/\/localhost:(\d+)/); if (match) base = `http://127.0.0.1:${match[1]}`; }); for (let attempt = 0; attempt < 200; attempt += 1) { try { if (base && (await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('backup freshness server did not start'); };
try {
  writeFileSync(backupFile, JSON.stringify({ 'johnson-service-co': {} })); const stale = new Date(Date.now() - 3 * 60 * 60 * 1000); utimesSync(backupFile, stale, stale);
  await waitForServer(); const response = await fetch(`${base}/api/ready`); const body = await response.json();
  if (response.status !== 503 || body.checks?.backupFreshnessConfiguration !== true || body.checks?.backupSnapshot !== false || !body.issues?.some((item) => item.key === 'backupSnapshot')) throw new Error('stale backups did not fail production readiness with an actionable snapshot issue');
  console.log('Northstar backup freshness test passed');
} finally { child.kill(); for (const file of [dataFile, backupFile, sessionFile, `${dataFile}.tmp`, `${backupFile}.tmp`]) if (existsSync(file)) rmSync(file, { force: true }); }
