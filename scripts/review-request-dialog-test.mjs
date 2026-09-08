import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('review-request-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-job-action="review-request"') && dialog.includes('repository.requestReview') && dialog.includes('customer_channel_opted_out') && dialog.includes('SMS') && dialog.includes('Email') && dialog.includes('form.reportValidity'), 'Review request dialog contract is incomplete');
assert(index.includes('review-request-dialog.js') && sw.includes("'/review-request-dialog.js'"), 'Review request dialog is not wired into the owner shell');
console.log('Northstar review request dialog checks passed');
