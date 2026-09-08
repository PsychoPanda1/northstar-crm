import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('request-bulk-resolve-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#bulk-request-resolve') && dialog.includes('repository.bulkResolveRequests') && dialog.includes('maxlength="500"') && dialog.includes('data-request-bulk-select') && dialog.includes('required'), 'Bulk request resolution dialog contract is incomplete');
assert(index.includes('request-bulk-resolve-dialog.js') && sw.includes("'/request-bulk-resolve-dialog.js'"), 'Bulk request resolution dialog is not wired into the owner shell');
console.log('Northstar bulk request resolution dialog checks passed');
