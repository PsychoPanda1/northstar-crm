import { readFile } from 'node:fs/promises';
const [html, source, serviceWorker] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../job-cost-dialog.js', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8')]);
for (const snippet of ['job-cost-dialog.js', "id = 'job-cost-dialog'", 'data-job-cost-action="labor"', 'data-job-cost-action="material"', 'repository.logLabor', 'repository.consumeMaterial', 'getJobDetail', 'stopImmediatePropagation()']) if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing job cost dialog contract: ${snippet}`);
if (!serviceWorker.includes("'/job-cost-dialog.js'")) throw new Error('Job cost dialog must be precached for offline owner navigation');
console.log('Northstar job cost dialog checks passed');
