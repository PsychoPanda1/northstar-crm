import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suffix = `${process.pid}-${Date.now()}`;
const dataFile = join(tmpdir(), `northstar-privacy-${suffix}.json`);
const sessionFile = `${dataFile}.sessions`;
const port = 5700 + Math.floor(Math.random() * 100);
const env = { ...process.env, NODE_ENV: 'development', PORT: String(port), NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: sessionFile };
const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
const cleanup = () => { child.kill(); for (const file of [dataFile, sessionFile, `${dataFile}.tmp`]) if (existsSync(file)) unlinkSync(file); };
const request = async (path, options = {}) => { const response = await fetch(`http://127.0.0.1:${port}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const post = (path, body, token) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  for (let attempt = 0; attempt < 200; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); if (attempt === 199) throw new Error('privacy export test server did not start'); }
  const login = await post('/api/auth/demo-login?service=default', { service: 'default', role: 'owner' }); assert(login.response.ok && login.body.token, 'privacy export login failed');
  const token = login.body.token;
  const created = await post('/api/customers', { name: 'Privacy Export Customer', phone: '843-555-0444', location: '1 Privacy Lane' }, token); assert(created.response.status === 201, 'privacy export customer setup failed');
  const activity = await post('/api/activities', { customerId: created.body.id, channel: 'Note', note: 'Export me' }, token); assert(activity.response.status === 201, 'privacy export linked record setup failed');
  const exported = await request(`/api/customers/${encodeURIComponent(created.body.id)}/privacy-export`, { headers: { authorization: `Bearer ${token}` } });
  assert(exported.response.ok && exported.body.customer.id === created.body.id, 'privacy export did not include customer'); assert(exported.body.collections.activities.some((item) => item.note === 'Export me'), 'privacy export did not include linked activity');
  console.log('Northstar customer privacy export test passed');
} finally { cleanup(); }
