import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(`${root}/index.html`, 'utf8');
const serviceWorker = readFileSync(`${root}/northstar-sw.js`, 'utf8');
const owner = readFileSync(`${root}/customer-merge-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/customer-merge-owner.js'), 'customer merge owner script is not loaded');
assert(serviceWorker.includes("'/customer-merge-owner.js'"), 'customer merge owner script is not cached for offline shell reuse');
assert(owner.includes('repository.list') && owner.includes('mergeCustomer'), 'customer merge UI does not use tenant-scoped repository methods');
assert(owner.includes('status !== \'Merged\''), 'customer merge UI does not exclude already merged records');
assert(owner.includes('type="checkbox"') && owner.includes('required'), 'customer merge UI lacks explicit confirmation');
assert(owner.includes('stopImmediatePropagation') && owner.includes('showModal'), 'customer merge UI does not override the legacy prompts with an accessible dialog');
assert(owner.includes('role="status"') && owner.includes('aria-live="polite"'), 'customer merge UI needs an accessible status message');
console.log('Northstar customer merge UI contract passed');
