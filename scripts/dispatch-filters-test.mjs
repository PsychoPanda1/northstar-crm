import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const required = [
  'const dispatchFilters = { status: \'\', priority: \'\', technician: \'\' }',
  "id = 'dispatch-filters'",
  'Filter dispatch status',
  'Filter dispatch priority',
  'Filter dispatch technician',
  'dispatchFilters[name] = select.value',
  'refreshFilteredDispatch()',
  "dispatchFilters.status = ''; dispatchFilters.priority = ''; dispatchFilters.technician = ''",
  "dispatchFilters.technician === 'Unassigned' && !item.technician"
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`dispatch filter wiring missing: ${snippet}`);
}
console.log('Northstar dispatch filter checks passed');
