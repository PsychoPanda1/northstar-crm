import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(`${root}/index.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/customer-pricing-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/customer-pricing-owner.js'), 'customer pricing owner script is not loaded');
assert(serviceWorker.includes("'/customer-pricing-owner.js'"), 'customer pricing owner script is not cached for offline shell reuse');
assert(owner.includes('listCustomerPricing') && owner.includes('setCustomerPricing'), 'customer pricing UI does not use the tenant-scoped repository methods');
assert(owner.includes('CURRENT OVERRIDES') && owner.includes('Negotiated pricebook'), 'customer pricing UI does not show current overrides');
assert(owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'customer pricing UI does not override the legacy prompt with an accessible dialog');
console.log('Northstar customer pricing UI contract passed');
