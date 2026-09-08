import { readFile } from 'node:fs/promises';

const [customer, dialog] = await Promise.all([
  readFile(new URL('../customer.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-estimate-dialog.js', import.meta.url), 'utf8')
]);

for (const snippet of ['customer-estimate-dialog.js', 'data-action="approve"', 'data-action="decline"', 'data-action="request-change"']) {
  if (!customer.includes(snippet)) throw new Error(`customer estimate action wiring missing: ${snippet}`);
}
for (const snippet of ["id = 'customer-estimate-dialog'", '/api/public/estimate/${action}', 'approverName', 'data-estimate-action-status', 'stopImmediatePropagation()', 'idempotency-key']) {
  if (!dialog.includes(snippet)) throw new Error(`customer estimate dialog contract missing: ${snippet}`);
}
console.log('Northstar customer estimate dialog checks passed');
