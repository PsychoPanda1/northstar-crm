import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dispatch-bulk-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'dispatch-bulk-dialog'/);
assert.match(source, /data-dispatch-bulk-assign/);
assert.match(source, /data-bulk-status/);
assert.match(source, /bulkAssignJobs/);
assert.match(source, /bulkUpdateJobStatus/);
assert.match(source, /bulkRescheduleJobs/);
assert.match(source, /data-bulk-reschedule/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /form\.reportValidity/);
assert.match(source, /aria-live="polite"/);
console.log('Dispatch bulk dialog contract passed');
