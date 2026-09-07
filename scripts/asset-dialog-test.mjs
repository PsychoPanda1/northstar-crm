import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('asset-dialog.js', root), 'utf8');
assert(html.includes('/asset-dialog.js'), 'asset dialog is not loaded');
assert(source.includes('#add-asset') && source.includes('createAsset'), 'asset trigger or API is missing');
assert(source.includes('repository.list') && source.includes('customerId'), 'asset dialog does not attach equipment to a tenant customer');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'asset dialog must capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'asset dialog needs an accessible status message');
assert(source.includes('maxlength="120"') && source.includes('maxlength="100"'), 'asset field bounds are missing');
assert(source.includes('warrantyThrough') && source.includes('type="date"'), 'asset warranty/date handling is missing');
console.log('Northstar asset dialog checks passed');
