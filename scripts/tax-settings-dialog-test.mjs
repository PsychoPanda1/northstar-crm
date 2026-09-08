import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('tax-settings-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#tax-settings') && dialog.includes('repository.getTaxSettings') && dialog.includes('repository.updateTaxSettings') && dialog.includes('min="0"') && dialog.includes('max="30"') && dialog.includes('form.reportValidity'), 'Tax settings dialog contract is incomplete');
assert(index.includes('tax-settings-dialog.js') && sw.includes("'/tax-settings-dialog.js'"), 'Tax settings dialog is not wired into the owner shell');
console.log('Northstar tax settings dialog checks passed');
