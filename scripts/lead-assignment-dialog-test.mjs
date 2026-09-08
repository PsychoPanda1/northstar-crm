import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('lead-assignment-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-lead-assignment') && dialog.includes('repository.assignLead') && dialog.includes('maxlength="120"') && dialog.includes('form.reportValidity') && dialog.includes('showModal'), 'Lead assignment dialog contract is incomplete');
assert(index.includes('lead-assignment-dialog.js') && sw.includes("'/lead-assignment-dialog.js'"), 'Lead assignment dialog is not wired into the owner shell');
console.log('Northstar lead assignment dialog checks passed');
