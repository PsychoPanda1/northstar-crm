import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../crew-assignment-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('crew-assignment-dialog.js')) throw new Error('crew assignment dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'crew-assignment-dialog'", 'data-crew-assign', "list('team'", 'assignJobCrew', 'type="checkbox"', 'schedule checks remain authoritative', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`crew assignment dialog contract missing: ${snippet}`);
}
console.log('Northstar crew assignment dialog checks passed');
