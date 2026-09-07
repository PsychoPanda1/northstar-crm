import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteStore } from '../storage-adapter.mjs';

const sqlite = await import('node:sqlite').catch(() => null);
if (!sqlite) { console.log('Northstar SQLite adapter test skipped: node:sqlite unavailable in this runtime'); process.exit(0); }
const file = join(tmpdir(), `northstar-storage-adapter-${process.pid}-${Date.now()}.sqlite`);
const backupFile = `${file}.backup`;
let first;
let second;
try {
  first = createSqliteStore(sqlite.DatabaseSync, file);
  second = createSqliteStore(sqlite.DatabaseSync, file);
  first.writeState({ version: 1, source: 'first' });
  second.writeSessions([{ sid: 'session-1' }]);
  first.backupTo(backupFile);
  const backupHealth = first.backupHealth(backupFile);
  const firstPragmas = first.getPragmas();
  const secondPragmas = second.getPragmas();
  if (String(firstPragmas.journalMode).toLowerCase() !== 'wal' || Number(firstPragmas.busyTimeout) !== 5000 || String(secondPragmas.journalMode).toLowerCase() !== 'wal' || Number(secondPragmas.busyTimeout) !== 5000 || !first.integrityCheck() || !second.integrityCheck() || !backupHealth.present || !backupHealth.valid || first.readState({}).source !== 'first' || second.readSessions([])[0]?.sid !== 'session-1') throw new Error('SQLite adapter did not configure WAL/busy timeout, pass integrity checks, create a valid backup, or persist through multiple handles');
  console.log('Northstar SQLite adapter test passed');
} finally {
  first?.close();
  second?.close();
  for (const filePath of [file, `${file}-wal`, `${file}-shm`, backupFile, `${backupFile}.wal`, `${backupFile}.shm`, `${backupFile}.tmp`]) if (existsSync(filePath)) rmSync(filePath, { force: true });
}
