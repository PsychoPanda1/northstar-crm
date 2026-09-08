import { readFile } from 'node:fs/promises';

const [index, owner, worker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../invoice-payment-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(index.includes('/invoice-payment-owner.js'), 'owner invoice payment dialog is not loaded');
assert(worker.includes("'/invoice-payment-owner.js'"), 'owner invoice payment dialog is not cached');
for (const marker of ['invoice-payment-dialog', 'name="amount"', 'name="method"', 'name="reference"', 'stopImmediatePropagation()', 'showModal()', 'crypto.randomUUID()']) assert(owner.includes(marker), `invoice payment dialog missing ${marker}`);
assert(repository.includes('async payInvoice(id, amount, method') && repository.includes("'idempotency-key': idempotencyKey"), 'owner payment submission must carry amount, method, reference, and idempotency');
console.log('Northstar owner invoice payment dialog contract passed.');
