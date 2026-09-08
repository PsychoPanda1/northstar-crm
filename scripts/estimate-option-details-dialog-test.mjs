import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../estimate-option-details-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'estimate-option-details-dialog'/);
assert.match(source, /data-estimate-option-details/);
assert.match(source, /updateEstimateOptionDetails/);
assert.match(source, /data-estimate-option-id/);
assert.match(source, /split\('\\n'\)/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Estimate option details dialog contract passed');
