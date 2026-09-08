import { readFile } from 'node:fs/promises';

const [index, dialog, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../job-complete-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.includes('/job-complete-dialog.js'), 'job completion dialog is not loaded');
assert(worker.includes("'/job-complete-dialog.js'"), 'job completion dialog is not cached');
for (const marker of ['job-complete-dialog', 'name="note"', 'maxlength="500"', 'stopImmediatePropagation()', 'showModal()', 'crypto.randomUUID()']) assert(dialog.includes(marker), `job completion dialog missing ${marker}`);
assert(repository.includes('async completeJob(id, note, idempotencyKey') && repository.includes("'idempotency-key': idempotencyKey"), 'job completion must carry idempotency');
console.log('Northstar owner job completion dialog contract passed.');
