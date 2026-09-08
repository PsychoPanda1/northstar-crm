import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('material-lookup-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#lookup-material') && dialog.includes('repository.lookupMaterial') && dialog.includes('maxlength="120"') && dialog.includes('form.reportValidity') && dialog.includes('showModal'), 'Material lookup dialog contract is incomplete');
assert(index.includes('material-lookup-dialog.js') && sw.includes("'/material-lookup-dialog.js'"), 'Material lookup dialog is not wired into the owner shell');
console.log('Northstar material lookup dialog checks passed');
