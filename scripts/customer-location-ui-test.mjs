import { readFile } from 'node:fs/promises';

const [index, dialog, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-location-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(index.includes('/customer-location-owner.js'), 'customer location dialog is not loaded');
assert(worker.includes("'/customer-location-owner.js'"), 'customer location dialog is not cached');
for (const marker of ['customer-location-dialog', 'name="label"', 'name="address"', 'maxlength="180"', 'stopImmediatePropagation()', 'showModal()', 'crypto.randomUUID()']) assert(dialog.includes(marker), `customer location dialog missing ${marker}`);
assert(repository.includes('async createLocation(customerId, label, address, idempotencyKey'), 'customer location must use idempotent repository method');
console.log('Northstar owner customer location dialog contract passed.');
