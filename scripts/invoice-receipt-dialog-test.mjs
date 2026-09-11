import { readFile } from 'node:fs/promises';
const [index, sw, source] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'), readFile(new URL('../invoice-receipt-dialog.js', import.meta.url), 'utf8')]);
for (const snippet of ['invoice-receipt-dialog.js', 'getInvoiceReceipt', 'clipboard.writeText', 'data-invoice-receipt', 'stopImmediatePropagation()']) if (![index, sw, source].some((text) => text.includes(snippet))) throw new Error(`invoice receipt dialog contract missing: ${snippet}`);
console.log('Northstar invoice receipt dialog checks passed');
