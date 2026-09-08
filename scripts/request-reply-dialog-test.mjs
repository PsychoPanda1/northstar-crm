import assert from 'node:assert/strict';
import fs from 'node:fs';
const dialog = fs.readFileSync('request-reply-dialog.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('northstar-sw.js', 'utf8');
assert(dialog.includes('data-request-action="reply"') && dialog.includes('repository.replyToRequest') && dialog.includes('SMS') && dialog.includes('Email') && dialog.includes('maxlength="1000"') && dialog.includes('form.reportValidity'), 'Request reply dialog contract is incomplete');
assert(index.includes('request-reply-dialog.js') && sw.includes("'/request-reply-dialog.js'"), 'Request reply dialog is not wired into the owner shell');
console.log('Northstar request reply dialog checks passed');
