import { readFile } from 'node:fs/promises';

const [index, dialog] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../job-access-link-dialog.js', import.meta.url), 'utf8'),
]);
if (!index.includes('job-access-link-dialog.js')) throw new Error('job access link dialog must be loaded by the owner workspace');
for (const snippet of ["id = 'job-access-link-dialog'", 'data-job-action="link"', 'data-job-action="customer-link"', 'data-job-action="review-link"', 'technicianLink', 'customerLink', 'reviewLink', 'clipboard.writeText', 'readonly', 'expiry', 'stopImmediatePropagation()']) {
  if (!dialog.includes(snippet)) throw new Error(`job access link dialog contract missing: ${snippet}`);
}
console.log('Northstar job access link dialog checks passed');
