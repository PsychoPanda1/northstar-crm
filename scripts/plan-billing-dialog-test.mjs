import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('plan-billing-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-plan-bill') && dialog.includes('data-plan-cycle') && dialog.includes('repository.createPlanInvoice') && dialog.includes('repository.billPlanCycle') && dialog.includes('type="month"') && dialog.includes('form.reportValidity'), 'Plan billing dialog contract is incomplete');
assert(index.includes('plan-billing-dialog.js') && sw.includes("'/plan-billing-dialog.js'"), 'Plan billing dialog is not wired into the owner shell');
console.log('Northstar plan billing dialog checks passed');
