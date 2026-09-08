import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('invoice-payment-link-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-invoice-link-action') && dialog.includes('repository.invoicePaymentLink') && dialog.includes('navigator.clipboard') && dialog.includes('expiresInHours') && dialog.includes('showModal'), 'Invoice payment-link dialog contract is incomplete');
assert(index.includes('invoice-payment-link-dialog.js'), 'Invoice payment-link dialog is not loaded');
assert(sw.includes("'/invoice-payment-link-dialog.js'"), 'Invoice payment-link dialog is not cached');
console.log('Northstar invoice payment-link dialog checks passed');
