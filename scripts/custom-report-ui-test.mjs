import { readFile } from 'node:fs/promises';

const owner = await readFile(new URL('../custom-report-owner.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
for (const snippet of ['comparisonChart', 'Current and previous period comparison', 'report-comparison-current', 'report-comparison-previous']) {
  if (!owner.includes(snippet) && !styles.includes(snippet)) throw new Error(`custom report comparison visualization missing: ${snippet}`);
}
console.log('Northstar custom report UI checks passed');
