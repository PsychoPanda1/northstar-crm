import { readFile } from 'node:fs/promises';

const [customer, dialog, app, server] = await Promise.all([
  readFile(new URL('../customer.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-estimate-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8')
]);

for (const snippet of ['customer-estimate-dialog.js', 'data-action="approve"', 'data-action="decline"', 'data-action="request-change"']) {
  if (!customer.includes(snippet)) throw new Error(`customer estimate action wiring missing: ${snippet}`);
}
for (const snippet of ["id = 'customer-estimate-dialog'", '/api/public/estimate/${action}', 'approverName', 'data-estimate-action-status', 'stopImmediatePropagation()', 'idempotency-key']) {
  if (!dialog.includes(snippet)) throw new Error(`customer estimate dialog contract missing: ${snippet}`);
}
for (const snippet of ['Estimate change requested', 'data-estimate-line-items', 'Review and update scope']) {
  if (!app.includes(snippet)) throw new Error(`estimate change notification action missing: ${snippet}`);
}
if (!server.includes('N-estimate-change-${estimate.id}')) throw new Error('estimate change notification contract missing');
console.log('Northstar customer estimate dialog checks passed');
