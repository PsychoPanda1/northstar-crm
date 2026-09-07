import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = readFileSync(`${root}/app.js`, 'utf8');
const repository = readFileSync(`${root}/data-repository.js`, 'utf8');

if (!app.includes("id = 'data-retention-view'") || !app.includes("button.hidden = sessionRole !== 'owner'") || !app.includes('data-retention-archive') || !app.includes('This is reversible from the retention archive.') || !repository.includes('async getDataRetentionReport()') || !repository.includes('async archiveDataRetentionRecords(')) {
  throw new Error('data retention owner UI contract failed');
}

console.log('Northstar data retention owner UI contract passed');
