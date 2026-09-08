import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../invoice-payment-schedule-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('invoice-payment-schedule-dialog.js')) throw new Error('invoice payment schedule dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'invoice-payment-schedule-dialog'", 'data-invoice-action="schedule"', "list('invoices'", 'Remaining invoice balance', 'createPaymentSchedule', 'At booking', 'On completion', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`invoice payment schedule dialog contract missing: ${snippet}`);
}
console.log('Northstar invoice payment schedule dialog checks passed');
