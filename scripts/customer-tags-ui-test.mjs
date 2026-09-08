import { readFile } from 'node:fs/promises';

const [index, dialog, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-tags-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.includes('/customer-tags-owner.js'), 'customer tags dialog is not loaded');
assert(worker.includes("'/customer-tags-owner.js'"), 'customer tags dialog is not cached');
for (const marker of ['customer-tags-dialog', 'name="tags"', 'maxlength="520"', 'stopImmediatePropagation()', 'showModal()', 'crypto.randomUUID()']) assert(dialog.includes(marker), `customer tags dialog missing ${marker}`);
assert(repository.includes('async updateCustomerTags(customerId, tags, idempotencyKey'), 'customer tags must use the idempotent repository method');
console.log('Northstar owner customer tags dialog contract passed.');
