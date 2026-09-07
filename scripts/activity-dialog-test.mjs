import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('activity-dialog.js', root), 'utf8');
assert(html.includes('/activity-dialog.js'), 'activity dialog is not loaded');
assert(source.includes('#log-activity') && source.includes('logActivity'), 'activity trigger or API is missing');
assert(source.includes('repository.list') && source.includes('customerId'), 'activity dialog does not attach notes to a tenant customer');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'activity dialog must capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'activity dialog needs an accessible status message');
assert(source.includes('maxlength="1000"') && source.includes('What happened?'), 'activity note bounds are missing');
console.log('Northstar activity dialog checks passed');
