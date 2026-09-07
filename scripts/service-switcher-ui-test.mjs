import { readFile } from 'node:fs/promises';

const [index, source] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../service-switcher-owner.js', import.meta.url), 'utf8')
]);
for (const snippet of [
  'service-switcher-owner.js',
  "id = 'service-switcher-dialog'",
  'repository.listServices()',
  'data-service-choice',
  'aria-current="page"',
  'window.location.href = `/?service=${encodeURIComponent(service)}`'
]) {
  if (![index, source].some((text) => text.includes(snippet))) throw new Error(`service switcher contract missing: ${snippet}`);
}
console.log('Northstar service switcher UI checks passed');
