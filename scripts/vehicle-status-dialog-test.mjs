import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('vehicle-status-dialog.js', root), 'utf8');
assert(html.includes('/vehicle-status-dialog.js'), 'vehicle status dialog script is not loaded');
assert(source.includes('data-vehicle-status') && source.includes('updateVehicleStatus'), 'vehicle status trigger or API is missing');
assert(source.includes('listVehicles') && source.includes('Active') && source.includes('Maintenance') && source.includes('Retired'), 'vehicle status choices are incomplete');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'vehicle status dialog does not replace the prompt flow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'vehicle status dialog needs an accessible status message');
console.log('Northstar vehicle status dialog checks passed');
