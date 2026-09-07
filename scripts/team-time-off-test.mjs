import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 6900 + Math.floor(Math.random() * 300);
const dataFile = join(tmpdir(), `northstar-team-time-off-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const waitForServer = async () => { for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('team time-off test server did not start'); };

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await post('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  const auth = { authorization: `Bearer ${login.body.token}` };
  const team = await request('/api/team', { headers: auth });
  const member = team.body.items?.find((item) => item.name === 'Alex Rivera');
  const startsAt = '2030-06-10T13:00:00.000Z';
  const endsAt = '2030-06-10T17:00:00.000Z';
  const created = await post(`/api/team/${member?.id}/time-off`, { startsAt, endsAt, reason: 'Training' }, { ...auth, 'idempotency-key': 'team-time-off-1' });
  const duplicate = await post(`/api/team/${member?.id}/time-off`, { startsAt, endsAt, reason: 'Training' }, { ...auth, 'idempotency-key': 'team-time-off-1' });
  const overlap = await post(`/api/team/${member?.id}/time-off`, { startsAt: '2030-06-10T15:00:00.000Z', endsAt: '2030-06-10T18:00:00.000Z', reason: 'Personal' }, { ...auth, 'idempotency-key': 'team-time-off-2' });
  const bulk = await request('/api/team/time-off', { headers: auth });
  const canceled = await post(`/api/team/${member?.id}/time-off/${encodeURIComponent(created.body.id)}/cancel`, { note: 'Training moved.' }, auth);
  const afterCancel = await request('/api/team/time-off', { headers: auth });
  if (!login.response.ok || !member || created.response.status !== 201 || duplicate.response.status !== 200 || !duplicate.body.duplicate || overlap.response.status !== 409 || bulk.response.status !== 200 || !bulk.body.items?.some((item) => item.id === created.body.id) || canceled.response.status !== 200 || canceled.body.status !== 'Canceled' || !afterCancel.body.items?.some((item) => item.id === created.body.id && item.status === 'Canceled')) throw new Error('team time-off bulk listing did not create, deduplicate, reject overlap, or cancel safely');
  console.log('Northstar team time-off test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
