import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../bulk-import-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('bulk-import-dialog.js')) throw new Error('bulk import dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'bulk-import-dialog'", '#import-customers, #import-assets', 'dryRun: true', 'Import valid rows', 'type="checkbox"', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`bulk import dialog contract missing: ${snippet}`);
}
console.log('Northstar bulk import dialog checks passed');
