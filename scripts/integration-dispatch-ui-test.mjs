import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const required = [
  'data-integration-dispatch="messages"',
  'data-integration-dispatch="payments"',
  'repository.dispatchMessages(20)',
  'repository.dispatchPayments(20)',
  'data-operations-dispatch',
  "'LEAD HANDOFF': { method: 'dispatchLeads'",
  "DOCUMENTS: { method: 'dispatchDocuments'",
  'operationsButton.click()',
  'Integration health is unavailable',
  'data-job-tracking-history',
  'repository.getJobLocationHistory',
  'Could not load technician tracking history'
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`integration dispatch UI wiring missing: ${snippet}`);
}
console.log('Northstar integration dispatch UI checks passed');
