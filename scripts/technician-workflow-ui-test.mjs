import { readFile } from 'node:fs/promises';

const [html, source] = await Promise.all([
  readFile(new URL('../technician.html', import.meta.url), 'utf8'),
  readFile(new URL('../technician-workflow-dialog.js', import.meta.url), 'utf8')
]);

for (const snippet of [
  'technician-workflow-dialog.js',
  'id = \'technician-workflow-dialog\'',
  "'#en-route, #complete, #log-time'",
  "'/api/public/technician-job/status'",
  "'/api/public/technician-job/complete'",
  "'/api/public/technician-job/labor'",
  'reportValidity()',
  'stopImmediatePropagation()',
  'northstarFieldFetch',
  'new AbortController()',
  'timeoutMs: 60000'
]) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing technician workflow UI contract: ${snippet}`);
}

console.log('Northstar technician workflow UI checks passed');
