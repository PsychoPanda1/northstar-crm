import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('team-time-off-dialog.js', root), 'utf8');
assert(html.includes('/team-time-off-dialog.js'), 'time-off dialog script is not loaded');
assert(source.includes('#add-team-time-off') && source.includes('#manage-team-time-off'), 'time-off actions are not captured');
assert(source.includes('createTeamTimeOff') && source.includes('cancelTeamTimeOff') && source.includes('listTeamTimeOff'), 'time-off repository workflows are incomplete');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation()'), 'time-off dialog does not replace prompt flows');
assert(source.includes('role="status"') && source.includes('aria-live="polite"'), 'time-off dialog needs an accessible status message');
console.log('Northstar team time-off dialog checks passed');
