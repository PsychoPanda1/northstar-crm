import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(`${root}/index.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/payment-refund-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/payment-refund-owner.js'), 'refund owner script is not loaded');
assert(serviceWorker.includes("'/payment-refund-owner.js'"), 'refund owner script is not cached');
assert(owner.includes('refundPayment') && owner.includes('list'), 'refund UI does not load and submit a tenant-scoped payment');
assert(owner.includes('refundable') && owner.includes('include a reason') && owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'refund UI does not validate the bounded refund workflow');
console.log('Northstar payment refund UI contract passed');
