import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../material-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('material-dialog.js')) throw new Error('material dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'material-dialog'", '#add-material', 'createMaterial', 'setMaterialBarcode', 'reorderPoint', 'type="number"', 'role="status"', 'stopImmediatePropagation()']) {
  if (!dialog.includes(snippet)) throw new Error(`material dialog contract missing: ${snippet}`);
}
console.log('Northstar material dialog checks passed');
