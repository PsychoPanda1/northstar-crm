import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('asset-lookup-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#lookup-asset') && dialog.includes('repository.lookupAsset') && dialog.includes('maxlength="120"') && dialog.includes('form.reportValidity') && dialog.includes('showModal'), 'Asset lookup dialog contract is incomplete');
assert(index.includes('asset-lookup-dialog.js') && sw.includes("'/asset-lookup-dialog.js'"), 'Asset lookup dialog is not wired into the owner shell');
console.log('Northstar asset lookup dialog checks passed');
