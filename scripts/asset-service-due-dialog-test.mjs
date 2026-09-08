import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('asset-service-due-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-asset-service-due') && dialog.includes('repository.updateAsset') && dialog.includes('type="date"') && dialog.includes('data-clear-asset-due') && dialog.includes('form.reportValidity'), 'Asset service-due dialog contract is incomplete');
assert(index.includes('asset-service-due-dialog.js') && sw.includes("'/asset-service-due-dialog.js'"), 'Asset service-due dialog is not wired into the owner shell');
console.log('Northstar asset service-due dialog checks passed');
