import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-merge-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('customer-merge-dialog.js')) throw new Error('customer merge dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'customer-merge-dialog'", 'data-customer-merge', 'mergeCustomer', 'type="checkbox"', 'linked jobs', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`customer merge dialog contract missing: ${snippet}`);
}
console.log('Northstar customer merge dialog checks passed');
