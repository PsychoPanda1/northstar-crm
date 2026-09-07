import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(`${root}/index.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/customer-tax-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/customer-tax-owner.js'), 'customer tax owner script is not loaded');
assert(serviceWorker.includes("'/customer-tax-owner.js'"), 'customer tax owner script is not cached for offline shell reuse');
assert(owner.includes('getCustomerTaxStatus') && owner.includes('updateCustomerTaxStatus'), 'customer tax UI does not use tenant-scoped repository methods');
assert(owner.includes('EXEMPT') && owner.includes('TAXABLE') && owner.includes('exemptionNumber'), 'customer tax status controls are incomplete');
assert(owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'customer tax UI does not override the legacy prompt with an accessible dialog');
assert(owner.includes('role="status"') && owner.includes('aria-live="polite"'), 'customer tax UI needs an accessible status message');
console.log('Northstar customer tax UI contract passed');
