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
  return { readState: (fallback = {}) => read(stateRead, fallback), readSessions: (fallback = []) => read(sessionRead, fallback), writeState: (payload) => write(writeState, payload), writeSessions: (payload) => write(writeSessions, payload), getPragmas: () => ({ journalMode: database.prepare('PRAGMA journal_mode').get().journal_mode, busyTimeout: database.prepare('PRAGMA busy_timeout').get().timeout }), close: () => database.close() };
};
