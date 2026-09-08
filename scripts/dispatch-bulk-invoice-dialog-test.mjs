import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dispatch-bulk-invoice-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'dispatch-bulk-invoice-dialog'/);
assert.match(source, /data-bulk-invoice-amount/);
assert.match(source, /bulkInvoiceJobs/);
assert.match(source, /lineItemsByJob/);
assert.match(source, /form\.reportValidity/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Dispatch bulk invoice dialog contract passed');
