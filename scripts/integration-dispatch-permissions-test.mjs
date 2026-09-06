import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
for (const snippet of [
  "messages: ['owner', 'dispatcher']",
  "payments: ['owner', 'accountant']",
  'button.hidden = !(allowed[channel] || []).includes(sessionRole)',
  "addTeamButton.hidden = !['owner', 'dispatcher'].includes(sessionRole)",
  "userAccessButton.hidden = sessionRole !== 'owner'",
  "addTimeOffButton.hidden = !['owner', 'dispatcher'].includes(sessionRole)"
]) {
  if (!source.includes(snippet)) throw new Error(`integration dispatch permission wiring missing: ${snippet}`);
}
console.log('Northstar integration dispatch permission checks passed');
