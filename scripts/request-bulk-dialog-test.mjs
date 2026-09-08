import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('request-bulk-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#bulk-request-assign') && dialog.includes('#bulk-request-priority') && dialog.includes('repository.bulkAssignRequests') && dialog.includes('repository.bulkUpdateRequestPriority') && dialog.includes('data-request-bulk-select') && dialog.includes('required'), 'Bulk request dialog contract is incomplete');
assert(index.includes('request-bulk-dialog.js') && sw.includes("'/request-bulk-dialog.js'"), 'Bulk request dialog is not wired into the owner shell');
console.log('Northstar bulk request dialog checks passed');
