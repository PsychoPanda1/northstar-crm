import { readFile } from 'node:fs/promises';
const [html, source] = await Promise.all([readFile(new URL('../customer.html', import.meta.url), 'utf8'), readFile(new URL('../customer-payment-portal.js', import.meta.url), 'utf8')]);
for (const snippet of ['customer-payment-portal.js', "id = 'customer-payment-dialog'", 'data-action="pay"', "'/api/public/customer-portal/payment-intent'", "'/api/public/customer-portal/financing-intent'", 'data-payment-submit', 'stopImmediatePropagation()', 'Card and bank details are handled by the payment provider']) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`customer payment UI contract missing: ${snippet}`);
}
console.log('Northstar customer payment UI checks passed');
