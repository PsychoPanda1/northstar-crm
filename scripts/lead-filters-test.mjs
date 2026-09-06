import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const required = [
  "const leadQueueFilters = { status: '', assignedTo: '', source: '' }",
  "id = 'lead-queue-filters'",
  'Filter leads by status',
  'Filter leads by assigned owner',
  'Filter leads by source or campaign',
  'leadQueueFilters.status = status.value',
  'leadQueueFilters.assignedTo = assignee.value.trim()',
  'leadQueueFilters.source = source.value.trim()',
  "type === 'leads' ? leadQueueFilters : {}",
  "['', 'All stages'], ['New', 'New'], ['Contacted', 'Contacted'], ['Qualified', 'Qualified'], ['Estimate sent', 'Estimate sent'], ['Won', 'Won'], ['Lost', 'Lost'], ['Converted', 'Converted']"
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`lead filter wiring missing: ${snippet}`);
}
for (const snippet of ["requestUrl.searchParams.get('source')", 'sourceFilter', 'invalid_lead_queue_status_filter']) {
  if (!server.includes(snippet)) throw new Error(`lead server filter wiring missing: ${snippet}`);
}
for (const snippet of ['contactLead(', 'data-lead-contact', "leadContactMatch", 'lead.contact.queued']) {
  if (!source.includes(snippet) && !server.includes(snippet)) throw new Error(`lead contact wiring missing: ${snippet}`);
}
console.log('Northstar lead filter checks passed');
