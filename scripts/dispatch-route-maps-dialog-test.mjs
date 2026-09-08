import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dispatch-route-maps-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'dispatch-route-maps-dialog'/);
assert.match(source, /getRouteManifest/);
assert.match(source, /window\.open\('about:blank'/);
assert.match(source, /travelmode: 'driving'/);
assert.match(source, /form\.reportValidity/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Dispatch route maps dialog contract passed');
