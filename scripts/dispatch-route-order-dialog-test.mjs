import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dispatch-route-order-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'dispatch-route-order-dialog'/);
assert.match(source, /getRouteManifest/);
assert.match(source, /updateRouteOrder/);
assert.match(source, /data-route-position/);
assert.match(source, /new Set\(positions\)/);
assert.match(source, /form\.reportValidity/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Dispatch route order dialog contract passed');
