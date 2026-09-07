import { readFile } from 'node:fs/promises';

const [html, app, server] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8')
]);
for (const snippet of ['data-next-actions', 'data-next-action-count', 'nextActionRoute', 'data-next-action-id', 'recordSearch.dispatchEvent']) {
  if (!html.includes(snippet) && !app.includes(snippet)) throw new Error(`next action UI contract missing: ${snippet}`);
}
for (const snippet of ['nextActionsFor', 'reason:', 'sourceId:', 'nextActions: nextActionsFor(tenantId, 10)']) {
  if (!server.includes(snippet)) throw new Error(`next action API contract missing: ${snippet}`);
}
console.log('Northstar next-action UI checks passed');
