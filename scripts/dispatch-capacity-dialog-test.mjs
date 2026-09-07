import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('capacity-plan-dialog.js', root), 'utf8');
assert(html.includes('/capacity-plan-dialog.js'), 'capacity dialog script is not loaded');
assert(source.includes('#dispatch-capacity-view') && source.includes('setDispatchCapacity'), 'capacity trigger or repository mutation is missing');
assert(source.includes('getDispatchCapacity') && source.includes('repository.list'), 'capacity dialog does not load roster and workload');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'capacity dialog does not capture the prompt workflow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'capacity dialog needs an accessible status message');
assert(source.includes('min="30"') && source.includes('max="1440"') && source.includes('step="30"'), 'capacity target bounds are missing');
console.log('Northstar dispatch capacity dialog checks passed');
