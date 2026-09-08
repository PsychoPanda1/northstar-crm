import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../purchase-order-create-dialog.js', import.meta.url), 'utf8'),
]);

if (!index.includes('purchase-order-create-dialog.js')) throw new Error('purchase order creation dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'purchase-order-create-dialog'", 'materialId', 'createPurchaseOrder', 'data-material-action="reorder"', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`purchase order creation dialog contract missing: ${snippet}`);
}
console.log('Northstar purchase order creation dialog checks passed');
