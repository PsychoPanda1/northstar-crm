import { readFile } from 'node:fs/promises';

const [index, dialog, requestDialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../invoice-payment-schedule-dialog.js', import.meta.url), 'utf8'),
  readFile(new URL('../invoice-payment-request-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('invoice-payment-schedule-dialog.js')) throw new Error('invoice payment schedule dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'invoice-payment-schedule-dialog'", 'data-invoice-action="schedule"', "list('invoices'", 'Remaining invoice balance', 'createPaymentSchedule', 'At booking', 'On completion', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`invoice payment schedule dialog contract missing: ${snippet}`);
}
if (!index.includes('invoice-payment-request-dialog.js')) throw new Error('invoice payment request dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'invoice-payment-request-dialog'", 'data-invoice-payment-request', "list('invoices'", 'Outstanding balance', 'requestInvoicePayment', 'SMS', 'Email', 'stopImmediatePropagation()', 'role="status"', 'customer_channel_opted_out']) {
  if (!requestDialog.includes(snippet)) throw new Error(`invoice payment request dialog contract missing: ${snippet}`);
}
console.log('Northstar invoice payment schedule dialog checks passed');
