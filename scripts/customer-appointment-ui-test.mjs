import { readFile } from 'node:fs/promises';
const [html, source] = await Promise.all([readFile(new URL('../customer.html', import.meta.url), 'utf8'), readFile(new URL('../customer-appointment-portal.js', import.meta.url), 'utf8')]);
for (const snippet of ['customer-appointment-portal.js', "id = 'customer-appointment-dialog'", 'data-action="book"', 'data-action="reschedule"', 'data-action="cancel"', "'/api/public/customer-portal/book'", "'/api/public/customer-portal/reschedule'", "'/api/public/customer-portal/cancel'", 'data-intake-id', 'stopImmediatePropagation()', 'northstarPortalFetch', 'globalThis.AbortController', 'timeoutMs ?? 20000']) if (![html, source].some((text) => text.includes(snippet))) throw new Error(`customer appointment UI contract missing: ${snippet}`);
if (html.includes('let selectedLocationId')) throw new Error('customer appointment booking must use the accessible location dialog');
console.log('Northstar customer appointment UI checks passed');
