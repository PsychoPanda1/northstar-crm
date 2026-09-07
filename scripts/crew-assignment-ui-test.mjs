import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const script = await readFile(new URL('../crew-assignment-owner.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const snippet of ['id = \'crew-assignment-dialog\'', 'repository.assignJobCrew', 'data-crew-options', 'skills and schedule conflicts', 'data-crew-assign']) {
  if (!script.includes(snippet)) throw new Error(`crew assignment UI wiring missing: ${snippet}`);
}
if (!html.includes('src="/crew-assignment-owner.js"')) throw new Error('crew assignment owner script is not loaded');
console.log('Northstar crew assignment UI contract passed');
