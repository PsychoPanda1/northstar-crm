import { existsSync, renameSync, unlinkSync } from 'node:fs';

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS northstar_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS northstar_sessions (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const createSqliteStore = (DatabaseSync, file) => {
  const database = new DatabaseSync(file);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
  database.exec(SQLITE_SCHEMA);
  const stateRead = database.prepare('SELECT payload FROM northstar_state WHERE id = 1');
  const sessionRead = database.prepare('SELECT payload FROM northstar_sessions WHERE id = 1');
  const writeState = database.prepare('INSERT INTO northstar_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at');
  const writeSessions = database.prepare('INSERT INTO northstar_sessions (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at');
  const read = (statement, fallback) => { try { const row = statement.get(); return row?.payload ? JSON.parse(row.payload) : fallback; } catch { return fallback; } };
  const write = (statement, payload) => { const encoded = JSON.stringify(payload); const timestamp = new Date().toISOString(); database.exec('BEGIN IMMEDIATE'); try { statement.run(encoded, timestamp); database.exec('COMMIT'); } catch (error) { try { database.exec('ROLLBACK'); } catch {} throw error; } };
  const backupTo = (destination) => { const temporary = `${destination}.tmp`; try { if (existsSync(temporary)) unlinkSync(temporary); } catch {} database.exec(`VACUUM INTO '${temporary.replace(/'/g, "''")}'`); try { if (existsSync(destination)) unlinkSync(destination); } catch {} renameSync(temporary, destination); };
  const backupHealth = (backupFile) => { if (!backupFile || !existsSync(backupFile)) return { present: false, valid: false }; let backup; try { backup = new DatabaseSync(backupFile, { readOnly: true }); const result = backup.prepare('PRAGMA integrity_check').get().integrity_check === 'ok'; return { present: true, valid: result }; } catch { return { present: true, valid: false }; } finally { try { backup?.close(); } catch {} } };
  return { readState: (fallback = {}) => read(stateRead, fallback), readSessions: (fallback = []) => read(sessionRead, fallback), writeState: (payload) => write(writeState, payload), writeSessions: (payload) => write(writeSessions, payload), backupTo, backupHealth, getPragmas: () => ({ journalMode: database.prepare('PRAGMA journal_mode').get().journal_mode, busyTimeout: database.prepare('PRAGMA busy_timeout').get().timeout }), integrityCheck: () => { try { return database.prepare('PRAGMA integrity_check').get().integrity_check === 'ok'; } catch { return false; } }, close: () => database.close() };
};
