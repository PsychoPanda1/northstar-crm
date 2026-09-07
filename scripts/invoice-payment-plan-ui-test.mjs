import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(`${root}/index.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/invoice-payment-plan-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/invoice-payment-plan-owner.js'), 'invoice payment plan script is not loaded');
assert(serviceWorker.includes("'/invoice-payment-plan-owner.js'"), 'invoice payment plan script is not cached');
assert(owner.includes('createPaymentSchedule') && owner.includes('list'), 'payment plan UI does not load and save invoice schedules');
assert(owner.includes('less than the invoice total') && owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'payment plan UI does not validate and replace the prompt flow');
console.log('Northstar invoice payment plan UI contract passed');
