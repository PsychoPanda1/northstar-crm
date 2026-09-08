import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../report-export-range-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'report-export-range-dialog'/);
assert.match(source, /exportRecords/);
assert.match(source, /reportFilters/);
assert.match(source, /reportGroupBy/);
assert.match(source, /startDate > endDate/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Report export range dialog contract passed');
