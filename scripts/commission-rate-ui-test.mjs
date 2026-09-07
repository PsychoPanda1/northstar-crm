import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('commission-rate-owner.js', root), 'utf8');
assert(html.includes('/commission-rate-owner.js'), 'commission rate script is not loaded');
assert(source.includes('#commission-rate-view') && source.includes('setTeamCommissionRate'), 'commission rate trigger or API is missing');
assert(source.includes('repository.list') && source.includes('teamMemberId'), 'commission dialog does not select a tenant team member');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'commission dialog must capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'commission dialog needs an accessible status message');
assert(source.includes('min="0"') && source.includes('max="100"') && source.includes('step="0.01"'), 'commission rate bounds are missing');
console.log('Northstar commission rate UI contract passed');
