import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('purchase-order-approval-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('#bulk-purchase-approval') && dialog.includes('repository.approvePurchaseOrders') && dialog.includes('name="orderId"') && dialog.includes('required') && dialog.includes('form.reportValidity'), 'Purchase approval dialog contract is incomplete');
assert(index.includes('purchase-order-approval-dialog.js') && sw.includes("'/purchase-order-approval-dialog.js'"), 'Purchase approval dialog is not wired into the owner shell');
console.log('Northstar purchase order approval dialog checks passed');
