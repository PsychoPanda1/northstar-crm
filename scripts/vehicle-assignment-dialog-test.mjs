import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('vehicle-assignment-dialog.js', root), 'utf8');
assert(html.includes('/vehicle-assignment-dialog.js'), 'vehicle assignment dialog script is not loaded');
assert(source.includes('data-vehicle-assign') && source.includes('assignJobVehicle'), 'vehicle assignment trigger or API is missing');
assert(source.includes('listVehicles') && source.includes("item.status === 'Active'"), 'vehicle assignment does not restrict the picker to active vehicles');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'vehicle assignment dialog does not replace the prompt flow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'vehicle assignment dialog needs an accessible status message');
console.log('Northstar vehicle assignment dialog checks passed');
