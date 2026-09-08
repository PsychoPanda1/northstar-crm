import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../job-note-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('job-note-dialog.js')) throw new Error('job note dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'job-note-dialog'", 'data-job-note', 'addJobNote', 'maxlength="1000"', 'not shown to customers', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`job note dialog contract missing: ${snippet}`);
}
console.log('Northstar job note dialog checks passed');
