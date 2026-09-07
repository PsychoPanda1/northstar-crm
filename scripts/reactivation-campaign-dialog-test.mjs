import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('reactivation-campaign-dialog.js', root), 'utf8');
assert(html.includes('/reactivation-campaign-dialog.js'), 'reactivation dialog is not loaded');
assert(source.includes('#reactivation-campaign') && source.includes('queueReactivation'), 'reactivation trigger or API is missing');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'reactivation dialog must capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'reactivation dialog needs an accessible status message');
assert(source.includes('min="30"') && source.includes('max="730"'), 'reactivation inactivity bounds are missing');
assert(source.includes('<option selected>SMS</option>') && source.includes('<option>Email</option>'), 'reactivation channel choices are missing');
assert(source.includes('maxlength="80"') && source.includes('tag'), 'reactivation tag targeting is missing');
console.log('Northstar reactivation campaign dialog checks passed');
