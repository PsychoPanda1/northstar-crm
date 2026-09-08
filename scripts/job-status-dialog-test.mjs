import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('job-status-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-job-action="status"') && dialog.includes('repository.updateJob') && dialog.includes('Confirmed') && dialog.includes('En route') && dialog.includes('In progress') && dialog.includes('form.reportValidity'), 'Job status dialog contract is incomplete');
assert(index.includes('job-status-dialog.js') && sw.includes("'/job-status-dialog.js'"), 'Job status dialog is not wired into the owner shell');
console.log('Northstar job status dialog checks passed');
