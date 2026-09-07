import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const technician = readFileSync(new URL('../technician.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
assert.match(technician, /\/api\/public\/technician-job\/forms/);
assert.match(technician, /data-field-id/);
assert.match(technician, /showWhen/);
assert.match(technician, /idempotency-key/);
assert.match(app, /Configure forms/);
assert.match(app, /formDefinitions/);
console.log('Northstar structured form UI contract passed');
