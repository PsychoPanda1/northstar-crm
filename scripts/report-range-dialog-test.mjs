import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../report-range-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'report-range-dialog'/);
assert.match(source, /startDate/);
assert.match(source, /endDate/);
assert.match(source, /previousMarketing/);
assert.match(source, /previousTechnician/);
assert.match(source, /startDate > endDate/);
assert.match(source, /aria-live="polite"/);
console.log('Report range dialog contract passed');
