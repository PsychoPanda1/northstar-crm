import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../job-asset-link-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('job-asset-link-dialog.js')) throw new Error('job equipment link dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'job-asset-link-dialog'", 'data-link-job-asset', 'getCustomerProfile', 'linkJobAsset', 'Customer equipment', 'stopImmediatePropagation()', 'role="status"']) {
  if (!dialog.includes(snippet)) throw new Error(`job equipment link dialog contract missing: ${snippet}`);
}
console.log('Northstar job equipment link dialog checks passed');
