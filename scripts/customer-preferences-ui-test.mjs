import { readFile } from 'node:fs/promises';

const [index, dialog, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-preferences-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.includes('/customer-preferences-owner.js'), 'customer preferences dialog is not loaded');
assert(worker.includes("'/customer-preferences-owner.js'"), 'customer preferences dialog is not cached');
for (const marker of ['customer-preferences-dialog', 'name="smsOptOut"', 'name="emailOptOut"', 'stopImmediatePropagation()', 'showModal()', 'Saving…']) assert(dialog.includes(marker), `customer preferences dialog missing ${marker}`);
assert(repository.includes('async updateCustomerPreferences(customerId, preferences, idempotencyKey = crypto.randomUUID())'), 'customer preference repository method missing');
assert(repository.includes("'idempotency-key': idempotencyKey"), 'customer preference update must send an idempotency key');
console.log('Northstar owner customer preferences dialog contract passed.');
