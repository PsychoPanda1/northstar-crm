import { readFile } from 'node:fs/promises';

const [html, script, serviceWorker, repository, server] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../analytics-history-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8')
]);
for (const snippet of ['analytics-history-owner.js', 'analytics-history-view', 'data-analytics-capture', 'getAnalyticsHistory', 'captureAnalyticsSnapshot', '/api/reports/analytics-history', '/api/reports/analytics-snapshot', 'analyticsSnapshots']) {
  if (![html, script, repository, server].some((source) => source.includes(snippet))) throw new Error(`analytics history contract missing: ${snippet}`);
}
if (!serviceWorker.includes("'/analytics-history-owner.js'") || !serviceWorker.includes('northstar-shell-v8')) throw new Error('analytics history asset must remain installable offline');
if (!script.includes("['owner', 'accountant']")) throw new Error('analytics snapshot capture must remain owner/accountant scoped');
console.log('Northstar analytics history UI checks passed');
