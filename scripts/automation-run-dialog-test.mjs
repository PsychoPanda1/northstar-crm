import { readFile } from 'node:fs/promises';
const [index, sw, source] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'), readFile(new URL('../automation-run-dialog.js', import.meta.url), 'utf8')]);
for (const snippet of ['automation-run-dialog.js', 'runAutomations', 'lookaheadHours', 'estimateAgeDays', 'stopImmediatePropagation()']) if (![index, sw, source].some((text) => text.includes(snippet))) throw new Error(`automation run dialog contract missing: ${snippet}`);
console.log('Northstar automation run dialog checks passed');
