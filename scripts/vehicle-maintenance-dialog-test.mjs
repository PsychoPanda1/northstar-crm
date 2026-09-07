import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('vehicle-maintenance-dialog.js', root), 'utf8');
assert(html.includes('/vehicle-maintenance-dialog.js'), 'vehicle maintenance dialog script is not loaded');
assert(source.includes('data-vehicle-maintenance') && source.includes('updateVehicleMaintenance'), 'maintenance trigger or API is missing');
assert(source.includes('type="date"') && source.includes('type="number"') && source.includes('min="0"'), 'maintenance fields are not bounded');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'maintenance dialog does not replace the prompt flow');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'maintenance dialog needs an accessible status message');
console.log('Northstar vehicle maintenance dialog checks passed');
