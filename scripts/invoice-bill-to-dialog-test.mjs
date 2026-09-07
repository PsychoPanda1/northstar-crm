import { readFile } from 'node:fs/promises';

const [html, source] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../invoice-bill-to-dialog.js', import.meta.url), 'utf8')
]);

for (const snippet of [
  'invoice-bill-to-dialog.js',
  'id = \'invoice-bill-to-dialog\'',
  '[data-invoice-bill-to]',
  "repository.updateInvoiceBillTo(button.dataset.invoiceBillTo, billTo)",
  'name="terms"',
  'Net 30',
  'reportValidity()',
  'stopImmediatePropagation()'
]) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing invoice bill-to dialog contract: ${snippet}`);
}

console.log('Northstar invoice bill-to dialog checks passed');
