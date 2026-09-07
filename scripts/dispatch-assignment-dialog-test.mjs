import { readFile } from 'node:fs/promises';

const [html, source] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dispatch-assignment-dialog.js', import.meta.url), 'utf8')
]);

for (const snippet of [
  'dispatch-assignment-dialog.js',
  'id = \'dispatch-assignment-dialog\'',
  '[data-dispatch-bulk-assign]',
  '[data-job-action="assign"]',
  "repository.bulkAssignJobs(jobIds, select.value)",
  "repository.updateJob(jobIds[0], 'assign', select.value)",
  'schedule conflicts',
  'stopImmediatePropagation()'
]) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing dispatch assignment dialog contract: ${snippet}`);
}

console.log('Northstar dispatch assignment dialog checks passed');
