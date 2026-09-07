import { readFile } from 'node:fs/promises';
const [html, source, serviceWorker] = await Promise.all([readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../request-dialog.js', import.meta.url), 'utf8'), readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8')]);
for (const snippet of ['request-dialog.js', 'id = \'request-workflow-dialog\'', 'data-request-action="reply"', 'data-request-action="assign"', 'data-request-action="priority"', 'data-request-action="resolve"', 'repository.replyToRequest', 'repository.assignRequest', 'repository.updateRequestPriority', 'repository.resolveRequest', 'stopImmediatePropagation()']) if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing request dialog contract: ${snippet}`);
if (!serviceWorker.includes("'/request-dialog.js'")) throw new Error('Request dialog must be precached for offline owner navigation');
console.log('Northstar request dialog checks passed');
