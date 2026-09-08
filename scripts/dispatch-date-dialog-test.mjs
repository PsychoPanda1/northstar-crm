import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dispatch-date-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('dispatch-date-dialog.js')) throw new Error('dispatch date dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'dispatch-date-dialog'", '#dispatch-date-view', 'listDispatchForDate', 'type="date"', 'renderDispatchBoard', 'role="status"', 'stopImmediatePropagation()']) {
  if (!dialog.includes(snippet)) throw new Error(`dispatch date dialog contract missing: ${snippet}`);
}
console.log('Northstar dispatch date dialog checks passed');
