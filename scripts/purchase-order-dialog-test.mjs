import { readFile } from 'node:fs/promises';

const [index, dialog, app] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../purchase-order-actions-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8')
]);
for (const snippet of ['purchase-order-actions-dialog.js', 'data-purchase-action="match"', 'data-purchase-action="receive"']) if (!index.includes(snippet) && !app.includes(snippet)) throw new Error(`purchase order dialog wiring missing: ${snippet}`);
for (const snippet of ["id = 'purchase-order-actions-dialog'", 'invoiceNumber', 'locationId', 'matchPurchaseOrder', 'receivePurchaseOrder', 'stopImmediatePropagation()', 'role="status"']) if (!dialog.includes(snippet)) throw new Error(`purchase order dialog contract missing: ${snippet}`);
console.log('Northstar purchase order action dialog checks passed');
