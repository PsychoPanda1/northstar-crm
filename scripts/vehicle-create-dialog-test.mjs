import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('vehicle-create-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#add-vehicle') && dialog.includes('repository.createVehicle') && dialog.includes('licensePlate') && dialog.includes('form.reportValidity') && dialog.includes('showModal'), 'Vehicle create dialog contract is incomplete');
assert(index.includes('vehicle-create-dialog.js') && sw.includes("'/vehicle-create-dialog.js'"), 'Vehicle create dialog is not wired into the owner shell');
console.log('Northstar vehicle create dialog checks passed');
