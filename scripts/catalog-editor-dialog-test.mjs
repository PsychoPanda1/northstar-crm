import { readFile } from 'node:fs/promises';

const [html, source] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../catalog-editor-dialog.js', import.meta.url), 'utf8')
]);
for (const snippet of ['catalog-editor-dialog.js', 'catalog-editor-dialog', 'form.elements.durationMinutes', 'form.reportValidity()', 'repository.updateCatalogItem', 'data-catalog-action="edit"', 'stopImmediatePropagation()', 'role="alert"', 'const notify =', 'refreshCatalog']) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`catalog editor dialog contract missing: ${snippet}`);
}
console.log('Northstar catalog editor dialog contract passed');
