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
  const writeStateStatement = database.prepare('INSERT INTO northstar_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at');
  const writeSessionsStatement = database.prepare('INSERT INTO northstar_sessions (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at');
  const read = (statement, fallback) => { try { const row = statement.get(); return row?.payload ? JSON.parse(row.payload) : fallback; } catch { return fallback; } };
  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  let lastState = null;
  const recordKey = (item, index) => item && typeof item === 'object' ? String(item.id || item.key || item.eventId || item.batchId || `index:${index}`) : `index:${index}`;
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const mergeTenant = (base = {}, current = {}, local = {}, tenantId = 'unknown') => {
    const merged = {};
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(current || {}), ...Object.keys(local || {})])) {
      const baseValue = base?.[key]; const currentValue = current?.[key]; const localValue = local?.[key];
      if (same(currentValue, baseValue)) { merged[key] = clone(localValue); continue; }
      if (same(localValue, baseValue) || same(currentValue, localValue)) { merged[key] = clone(currentValue); continue; }
      if (Array.isArray(currentValue) && Array.isArray(localValue) && Array.isArray(baseValue)) {
        const baseById = new Map(baseValue.map((item, index) => [recordKey(item, index), item])); const currentById = new Map(currentValue.map((item, index) => [recordKey(item, index), item])); const localById = new Map(localValue.map((item, index) => [recordKey(item, index), item])); const values = []; const keys = new Set([...baseById.keys(), ...currentById.keys(), ...localById.keys()]);
        for (const itemKey of keys) { const before = baseById.get(itemKey); const remote = currentById.get(itemKey); const pending = localById.get(itemKey); if (same(remote, before)) values.push(clone(pending)); else if (same(pending, before) || same(remote, pending)) values.push(clone(remote)); else throw new Error(`sqlite_concurrent_write_conflict:${tenantId}:${key}:${itemKey}`); }
        merged[key] = values.filter((item) => item !== undefined); continue;
      }
      if (currentValue && localValue && typeof currentValue === 'object' && typeof localValue === 'object' && !Array.isArray(currentValue) && !Array.isArray(localValue)) { merged[key] = mergeTenant(baseValue || {}, currentValue, localValue, `${tenantId}:${key}`); continue; }
      throw new Error(`sqlite_concurrent_write_conflict:${tenantId}:${key}`);
    }
    return merged;
  };
  const mergeState = (base, current, local) => {
    if (!base || same(current, base)) return clone(local);
    const merged = {}; const tenantIds = new Set([...Object.keys(base || {}), ...Object.keys(current || {}), ...Object.keys(local || {})]);
    for (const tenantId of tenantIds) { const before = base?.[tenantId]; const remote = current?.[tenantId]; const pending = local?.[tenantId]; if (same(remote, before)) merged[tenantId] = clone(pending); else if (same(pending, before) || same(remote, pending)) merged[tenantId] = clone(remote); else merged[tenantId] = mergeTenant(before || {}, remote || {}, pending || {}, tenantId); }
    return merged;
  };
  const writeState = (payload) => { const timestamp = new Date().toISOString(); database.exec('BEGIN IMMEDIATE'); try { const row = database.prepare('SELECT payload FROM northstar_state WHERE id = 1').get(); const current = row?.payload ? JSON.parse(row.payload) : {}; const merged = mergeState(lastState || {}, current, payload); writeStateStatement.run(JSON.stringify(merged), timestamp); database.exec('COMMIT'); lastState = clone(merged); } catch (error) { try { database.exec('ROLLBACK'); } catch {} throw error; } };
  const write = (statement, payload) => { const encoded = JSON.stringify(payload); const timestamp = new Date().toISOString(); database.exec('BEGIN IMMEDIATE'); try { statement.run(encoded, timestamp); database.exec('COMMIT'); } catch (error) { try { database.exec('ROLLBACK'); } catch {} throw error; } };
  const writeSessions = (payload) => { const timestamp = new Date().toISOString(); database.exec('BEGIN IMMEDIATE'); try { const row = database.prepare('SELECT payload FROM northstar_sessions WHERE id = 1').get(); const current = row?.payload ? JSON.parse(row.payload) : []; const merged = [...new Set([...(Array.isArray(current) ? current : []), ...(Array.isArray(payload) ? payload : [])])]; writeSessionsStatement.run(JSON.stringify(merged), timestamp); database.exec('COMMIT'); } catch (error) { try { database.exec('ROLLBACK'); } catch {} throw error; } };
  const backupTo = (destination) => { const temporary = `${destination}.tmp`; try { if (existsSync(temporary)) unlinkSync(temporary); } catch {} database.exec(`VACUUM INTO '${temporary.replace(/'/g, "''")}'`); try { if (existsSync(destination)) unlinkSync(destination); } catch {} renameSync(temporary, destination); };
  const backupHealth = (backupFile) => { if (!backupFile || !existsSync(backupFile)) return { present: false, valid: false }; let backup; try { backup = new DatabaseSync(backupFile, { readOnly: true }); const result = backup.prepare('PRAGMA integrity_check').get().integrity_check === 'ok'; return { present: true, valid: result }; } catch { return { present: true, valid: false }; } finally { try { backup?.close(); } catch {} } };
  return { readState: (fallback = {}) => { const value = read(stateRead, fallback); lastState = clone(value); return value; }, readSessions: (fallback = []) => read(sessionRead, fallback), writeState, writeSessions, backupTo, backupHealth, getPragmas: () => ({ journalMode: database.prepare('PRAGMA journal_mode').get().journal_mode, busyTimeout: database.prepare('PRAGMA busy_timeout').get().timeout }), integrityCheck: () => { try { return database.prepare('PRAGMA integrity_check').get().integrity_check === 'ok'; } catch { return false; } }, close: () => database.close() };
};
