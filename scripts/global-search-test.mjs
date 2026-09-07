import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = readFileSync(`${root}/app.js`, 'utf8');
const html = readFileSync(`${root}/index.html`, 'utf8');

if (!html.includes('aria-label="Search"') || !app.includes('const openGlobalSearch = (attempts = 8)') || !app.includes('window.setTimeout(() => openGlobalSearch(attempts - 1), 50)')) {
  throw new Error('global search startup retry contract missing');
}
console.log('Northstar global search startup contract passed');
