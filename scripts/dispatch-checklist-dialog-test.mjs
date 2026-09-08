import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('dispatch-checklist-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-dispatch-checklist') && dialog.includes('repository.updateJobChecklist') && dialog.includes('maxlength="1500"') && dialog.includes('form.reportValidity') && dialog.includes('showModal'), 'Dispatch checklist dialog contract is incomplete');
assert(index.includes('dispatch-checklist-dialog.js') && sw.includes("'/dispatch-checklist-dialog.js'"), 'Dispatch checklist dialog is not wired into the owner shell');
console.log('Northstar dispatch checklist dialog checks passed');
