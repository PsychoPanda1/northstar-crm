import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(`${root}/technician.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/technician-payment-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(html.includes('/technician-payment-owner.js'), 'technician payment dialog is not loaded');
assert(serviceWorker.includes("'/technician-payment-owner.js'"), 'technician payment dialog is not cached');
assert(owner.includes('/api/public/technician-job/payment-intent') && owner.includes('installmentId'), 'technician payment dialog is not wired to invoice installments');
assert(owner.includes('Card') && owner.includes('ACH') && owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'technician payment dialog is missing method selection or prompt replacement');
console.log('Northstar technician payment UI contract passed');
