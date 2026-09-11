import { readFile } from 'node:fs/promises';
const [index, sw, source] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'), readFile(new URL('../technician-scorecard-period-dialog.js', import.meta.url), 'utf8')]);
for (const snippet of ['technician-scorecard-period-dialog.js', 'getTechnicianScorecards', 'getTechnicianScorecardConfig', 'End date must be on or after the start date.', 'stopImmediatePropagation()']) if (![index, sw, source].some((text) => text.includes(snippet))) throw new Error(`scorecard period dialog contract missing: ${snippet}`);
console.log('Northstar technician scorecard period dialog checks passed');
