import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('request-action-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-request-action="priority"') && dialog.includes('data-request-action="assign"') && dialog.includes('repository.updateRequestPriority') && dialog.includes('repository.assignRequest') && dialog.includes('maxlength="120"') && dialog.includes('form.reportValidity'), 'Request action dialog contract is incomplete');
assert(index.includes('request-action-dialog.js') && sw.includes("'/request-action-dialog.js'"), 'Request action dialog is not wired into the owner shell');
console.log('Northstar request action dialog checks passed');
