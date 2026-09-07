import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteStore } from '../storage-adapter.mjs';

const sqlite = await import('node:sqlite').catch(() => null);
if (!sqlite) { console.log('Northstar SQLite backup restore test skipped: node:sqlite unavailable in this runtime'); process.exit(0); }
const root = join(tmpdir(), `northstar-backup-restore-${process.pid}-${Date.now()}`);
const source = `${root}.sqlite`;
const backup = `${root}.backup`;
const restored = `${root}.restored.sqlite`;
let original;
let recovered;
try {
  original = createSqliteStore(sqlite.DatabaseSync, source);
  original.writeState({ version: 1, tenant: { id: 'tenant-restore-test', records: [{ id: 'JOB-RESTORE-1', status: 'Completed' }] } });
  original.writeSessions([{ sid: 'restore-session' }]);
  original.backupTo(backup);
  original.close();
  original = null;
  recovered = createSqliteStore(sqlite.DatabaseSync, backup);
  const state = recovered.readState({});
  const sessions = recovered.readSessions([]);
  if (!recovered.integrityCheck() || state.tenant?.records?.[0]?.id !== 'JOB-RESTORE-1' || sessions[0]?.sid !== 'restore-session') throw new Error('SQLite backup could not be opened and verified as a complete restore source');
  recovered.close();
  recovered = null;
  rmSync(backup, { force: true });
  recovered = createSqliteStore(sqlite.DatabaseSync, restored);
  recovered.writeState(state);
  recovered.writeSessions(sessions);
  if (!recovered.integrityCheck() || recovered.readState({}).tenant?.records?.[0]?.status !== 'Completed' || recovered.readSessions([])[0]?.sid !== 'restore-session') throw new Error('restored SQLite database did not preserve state and sessions');
  console.log('Northstar SQLite backup restore test passed');
} finally {
  original?.close();
  recovered?.close();
  for (const file of [source, `${source}-wal`, `${source}-shm`, backup, `${backup}-wal`, `${backup}-shm`, `${backup}.tmp`, restored, `${restored}-wal`, `${restored}-shm`]) if (existsSync(file)) rmSync(file, { force: true });
}
