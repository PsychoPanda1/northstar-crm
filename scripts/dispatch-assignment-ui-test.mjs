import { readFile } from 'node:fs/promises';

const [index, source] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dispatch-assignment-owner.js', import.meta.url), 'utf8')
]);
for (const snippet of [
  'dispatch-assignment-owner.js',
  'data-job-action="assign"',
  'repository.list(\'team\')',
  'Choose a technician for this job',
  'repository.updateJob(button.dataset.jobId, \'assign\', technician.name)',
  'event.stopImmediatePropagation()'
]) {
  if (!index.includes(snippet) && !source.includes(snippet)) throw new Error(`dispatch assignment contract missing: ${snippet}`);
}
if (source.includes('Assign Alex') || source.includes('data-job-value="Alex Rivera"')) throw new Error('dispatch assignment must not hard-code a technician');
console.log('Northstar dispatch assignment UI checks passed');
