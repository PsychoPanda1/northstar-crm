import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5000 + Math.floor(Math.random() * 100);
const dataFile = join(tmpdir(), `northstar-lead-bulk-status-${process.pid}-${Date.now()}.json`);
const env = { ...process.env, NODE_ENV: 'development', NORTHSTAR_ALLOW_DEMO_LOGIN: 'true', PORT: String(port), NORTHSTAR_DATA_FILE: dataFile, NORTHSTAR_SESSION_FILE: `${dataFile}.sessions` };
const base = `http://127.0.0.1:${port}`;
let child;
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); return { response, body: await response.json().catch(() => ({})) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error('lead bulk status test server did not start'); };
const postJson = (path, body, token, key) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { 'idempotency-key': key } : {}) }, body: JSON.stringify(body) });

try {
  child = spawn(process.execPath, ['server.mjs'], { cwd: root, env, stdio: 'ignore' });
  await waitForServer();
  const login = await postJson('/api/auth/demo-login?service=plumbing', { service: 'plumbing', role: 'owner' });
  if (!login.response.ok) throw new Error('lead bulk status test login failed');
  const token = login.body.token;
  const leads = [];
  for (const name of ['Bulk Status Alpha', 'Bulk Status Beta']) {
    const created = await postJson('/api/public/leads?service=plumbing', { name, phone: '843-555-02' + (name.endsWith('Alpha') ? '61' : '62'), source: 'Bulk status test' }, null, `lead-bulk-status-${name}`);
    if (created.response.status !== 201) throw new Error('lead bulk status test setup failed');
    leads.push(created.body.id);
  }
  const assignment = await postJson('/api/leads/bulk-assign', { leadIds: leads, assignedTo: 'Taylor Brooks' }, token, 'lead-bulk-assignment-test');
  const assignmentDuplicate = await postJson('/api/leads/bulk-assign', { leadIds: leads, assignedTo: 'Taylor Brooks' }, token, 'lead-bulk-assignment-test');
  const key = 'lead-bulk-status-test';
  const first = await postJson('/api/leads/bulk-status', { leadIds: leads, status: 'Qualified', note: 'Ready for estimate follow-up.' }, token, key);
  const duplicate = await postJson('/api/leads/bulk-status', { leadIds: leads, status: 'Qualified', note: 'Ready for estimate follow-up.' }, token, key);
  const conflict = await postJson('/api/leads/bulk-status', { leadIds: leads, status: 'Lost' }, token, key);
  const records = await request('/api/leads?search=Bulk%20Status', { headers: { authorization: `Bearer ${token}` } });
  const matching = (records.body.items || []).filter((item) => leads.includes(item.id));
  if (assignment.response.status !== 200 || assignment.body.updated?.length !== 2 || assignment.body.updated.every((item) => item.assignedTo === 'Taylor Brooks') !== true || assignmentDuplicate.response.status !== 200 || assignmentDuplicate.body.duplicate !== true || first.response.status !== 200 || first.body.updated?.length !== 2 || first.body.updated.every((item) => item.status === 'Qualified') !== true || duplicate.response.status !== 200 || duplicate.body.duplicate !== true || conflict.response.status !== 409 || conflict.body.error !== 'idempotency_key_reused' || matching.length !== 2 || matching.some((item) => item.status !== 'Qualified' || item.assignedTo !== 'Taylor Brooks')) throw new Error('bulk lead assignment or status behavior failed');
  console.log('Northstar lead bulk status test passed');
} finally {
  if (child && !child.killed) child.kill();
  for (const file of [dataFile, `${dataFile}.sessions`, `${dataFile}.tmp`, `${dataFile}.backup`]) if (existsSync(file)) rmSync(file, { force: true });
}
