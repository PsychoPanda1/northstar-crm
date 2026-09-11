import { readFile } from 'node:fs/promises';
const [index, sw, source] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'), readFile(new URL('../dispatch-route-summary-dialog.js', import.meta.url), 'utf8')]);
for (const snippet of ['dispatch-route-summary-dialog.js', 'getRouteSummary', 'TECHNICIAN WORKLOAD', 'data-route-summary', 'stopImmediatePropagation()']) if (![index, sw, source].some((text) => text.includes(snippet))) throw new Error(`route summary dialog contract missing: ${snippet}`);
console.log('Northstar dispatch route summary dialog checks passed');
