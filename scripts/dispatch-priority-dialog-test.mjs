import { readFile } from 'node:fs/promises';

const [index, dialog, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dispatch-priority-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.includes('/dispatch-priority-dialog.js'), 'dispatch priority dialog is not loaded');
assert(worker.includes("'/dispatch-priority-dialog.js'"), 'dispatch priority dialog is not cached');
for (const marker of ['dispatch-priority-dialog', 'name="priority"', 'Emergency', 'stopImmediatePropagation()', 'showModal()', 'updateJobPriority']) assert(dialog.includes(marker), `dispatch priority dialog missing ${marker}`);
assert(repository.includes('async updateJobPriority(id, priority)'), 'job priority repository method missing');
console.log('Northstar dispatch priority dialog contract passed.');
