import { readFile } from 'node:fs/promises';

const [customer, dialog, paymentMethod, app, server] = await Promise.all([
  readFile(new URL('../customer.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-estimate-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../customer-payment-method-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8')
]);

for (const snippet of ['customer-estimate-dialog.js', 'customer-payment-method-dialog.js', 'data-action="approve"', 'data-action="decline"', 'data-action="request-change"']) {
  if (!customer.includes(snippet)) throw new Error(`customer estimate action wiring missing: ${snippet}`);
}
for (const snippet of ["id = 'customer-estimate-dialog'", "aria-labelledby', 'customer-estimate-dialog-title'", "aria-describedby', 'customer-estimate-dialog-help'", '/api/public/estimate/${action}', 'approverName', 'data-estimate-action-status', 'stopImmediatePropagation()', 'idempotency-key']) {
  if (!dialog.includes(snippet)) throw new Error(`customer estimate dialog contract missing: ${snippet}`);
}
for (const snippet of ['id = \'customer-payment-method-dialog\'', 'providerPaymentMethodId', 'data-action="add-payment-method"', 'data-action="remove-payment-method"', 'window.open(\'about:blank\'', 'stopImmediatePropagation()', 'card or bank details']) {
  if (!paymentMethod.includes(snippet) && !customer.includes(snippet)) throw new Error(`customer payment method dialog contract missing: ${snippet}`);
}
for (const snippet of ['Estimate change requested', 'data-estimate-line-items', 'Review and update scope', "card.querySelectorAll('[data-estimate-reminder-action]')"]) {
  if (!app.includes(snippet)) throw new Error(`estimate change notification action missing: ${snippet}`);
}
if (!server.includes('N-estimate-change-${estimate.id}') || !server.includes("estimateId: item.id.slice('N-estimate-change-'.length)")) throw new Error('estimate change notification contract missing');
console.log('Northstar customer estimate dialog checks passed');
