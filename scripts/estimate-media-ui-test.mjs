import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(`${root}/estimate-media-owner.js`, 'utf8');
const index = readFileSync(`${root}/index.html`, 'utf8');
if (!source.includes("drawer.dataset.view !== 'estimates'") || !source.includes('data-estimate-media') || !source.includes('addEstimateMedia') || !source.includes("['reference', 'before', 'after', 'document']") || !index.includes('estimate-media-owner.js')) throw new Error('estimate media owner UI wiring is incomplete');
console.log('Northstar estimate media owner UI checks passed');
