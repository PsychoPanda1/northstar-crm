import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('task-dialog.js', root), 'utf8');
assert(html.includes('/task-dialog.js'), 'task dialog is not loaded');
assert(source.includes('.add-task') && source.includes('createTask'), 'task trigger or API is missing');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'task dialog must capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'task dialog needs an accessible status message');
assert(source.includes('maxlength="160"') && source.includes('maxlength="1000"'), 'task field bounds are missing');
assert(source.includes('type="date"') && source.includes('T12:00:00.000Z'), 'task due-date handling is missing');
console.log('Northstar task dialog checks passed');
