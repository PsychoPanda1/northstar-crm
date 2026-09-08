import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('asset-edit-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-asset-action="edit"') && dialog.includes('repository.updateAsset') && dialog.includes('form.reportValidity') && dialog.includes('status') && dialog.includes('showModal'), 'Asset edit dialog contract is incomplete');
assert(index.includes('asset-edit-dialog.js'), 'Asset edit dialog is not loaded');
assert(sw.includes("'/asset-edit-dialog.js'"), 'Asset edit dialog is not cached');
console.log('Northstar asset edit dialog checks passed');
