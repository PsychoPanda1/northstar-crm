import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('team-member-dialog.js', root), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(html.includes('/team-member-dialog.js'), 'team member dialog is not loaded');
assert(source.includes('#add-team') && source.includes('createTeamMember') && source.includes('crypto.randomUUID'), 'team member dialog does not use the idempotent team API');
assert(source.includes('showModal') && source.includes('stopImmediatePropagation') && source.includes('role="status"'), 'team member dialog is not accessible or does not replace the prompt');
console.log('Northstar team member dialog checks passed');
