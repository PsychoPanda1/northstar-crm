import { readFile } from 'node:fs/promises';

const [app, repository, settings] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8'),
  readFile(new URL('../settings.js', import.meta.url), 'utf8')
]);
for (const snippet of ['repository.listServices', 'Switch service workspace:', "window.location.href = `/?service="]) {
  if (!app.includes(snippet)) throw new Error(`workspace switcher contract missing: ${snippet}`);
}
if (!app.includes('data-document-operations-card') || !app.includes('metrics.queues?.documents') || !app.includes('dispatchDocuments(20)')) throw new Error('operations health must expose document delivery queue actions');
if (!app.includes('repository.getAvailability(serviceKey, 7, catalogSelect.value)') || app.includes('window.northstarRepository.getAvailability(service, 7);')) throw new Error('new-job scheduling must keep pricebook-aware availability without a stale default-duration listener');
if (!repository.includes("async listServices()") || !repository.includes("fetch('/api/session/services'")) throw new Error('repository service discovery contract missing');
if (!settings.includes('data-settings-service-cities') || !settings.includes('data-settings-service-zips') || !settings.includes('data-settings-save-service-area')) throw new Error('workspace settings must expose owner service-area qualification controls');
console.log('Northstar service workspace UI checks passed');
