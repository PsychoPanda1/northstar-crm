import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dispatch-route-calendar-dialog.js', import.meta.url), 'utf8');
assert.match(source, /id = 'dispatch-route-calendar-dialog'/);
assert.match(source, /downloadRouteCalendar/);
assert.match(source, /repository\.session\?\.owner/);
assert.match(source, /URL\.createObjectURL/);
assert.match(source, /form\.reportValidity/);
assert.match(source, /stopImmediatePropagation/);
assert.match(source, /aria-live="polite"/);
console.log('Dispatch route calendar dialog contract passed');
