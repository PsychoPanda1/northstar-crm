import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const required = [
  "const leadQueueFilters = { status: '', assignedTo: '' }",
  "id = 'lead-queue-filters'",
  'Filter leads by status',
  'Filter leads by assigned owner',
  'leadQueueFilters.status = status.value',
  'leadQueueFilters.assignedTo = assignee.value.trim()',
  "type === 'leads' ? leadQueueFilters : {}",
  "['', 'All stages'], ['New', 'New'], ['Contacted', 'Contacted'], ['Qualified', 'Qualified'], ['Estimate sent', 'Estimate sent'], ['Won', 'Won'], ['Lost', 'Lost'], ['Converted', 'Converted']"
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`lead filter wiring missing: ${snippet}`);
}
console.log('Northstar lead filter checks passed');
