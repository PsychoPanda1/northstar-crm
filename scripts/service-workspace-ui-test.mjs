import { readFile } from 'node:fs/promises';

const [app, repository] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
for (const snippet of ['repository.listServices', 'Switch service workspace:', "window.location.href = `/?service="]) {
  if (!app.includes(snippet)) throw new Error(`workspace switcher contract missing: ${snippet}`);
}
if (!app.includes('data-document-operations-card') || !app.includes('metrics.queues?.documents') || !app.includes('dispatchDocuments(20)')) throw new Error('operations health must expose document delivery queue actions');
if (!repository.includes("async listServices()") || !repository.includes("fetch('/api/session/services'")) throw new Error('repository service discovery contract missing');
console.log('Northstar service workspace UI checks passed');
