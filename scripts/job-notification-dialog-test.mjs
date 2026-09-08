import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('job-notification-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-dispatch-notify') && dialog.includes('repository.notifyJob') && dialog.includes('confirmation') && dialog.includes('en_route') && dialog.includes('completed') && dialog.includes('form.reportValidity'), 'Job notification dialog contract is incomplete');
assert(index.includes('job-notification-dialog.js') && sw.includes("'/job-notification-dialog.js'"), 'Job notification dialog is not wired into the owner shell');
console.log('Northstar job notification dialog checks passed');
