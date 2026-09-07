import { readFile } from 'node:fs/promises';

const [index, source, worker] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dispatch-bulk-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8')
]);
for (const snippet of [
  'dispatch-bulk-owner.js',
  'data-bulk-job',
  'data-dispatch-bulk-assign',
  'repository.bulkAssignJobs(jobIds, technician.name)',
  'repository.list(\'team\')',
  'data-dispatch-selection'
]) {
  if (![index, source, worker].some((text) => text.includes(snippet))) throw new Error(`bulk dispatch UI contract missing: ${snippet}`);
}
console.log('Northstar bulk dispatch UI checks passed');
