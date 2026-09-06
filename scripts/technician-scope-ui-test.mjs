import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const technician = await readFile(new URL('../technician.html', import.meta.url), 'utf8');
for (const snippet of ['const approvedScope = job.estimateSnapshot', 'approvedScope, intakeContext']) {
  if (!server.includes(snippet)) throw new Error(`technician sold-scope API wiring missing: ${snippet}`);
}
for (const snippet of ['const scope = brief.approvedScope', 'Approved sold scope', 'scope.options?.length']) {
  if (!technician.includes(snippet)) throw new Error(`technician sold-scope UI wiring missing: ${snippet}`);
}
console.log('Northstar technician sold-scope checks passed');
