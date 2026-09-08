import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
for (const snippet of [
  'name="customerSearch"',
  'repository.listPage',
  "listPage('customers'",
  'pageSize: 50',
  'customerSearch.oninput',
  'No matching customers'
]) assert(app.includes(snippet), `new-job customer search contract missing: ${snippet}`);
const jobBlockStart = app.indexOf('const customerSearch =');
const jobBlockEnd = app.indexOf('const slotSelect =', jobBlockStart);
assert(jobBlockStart >= 0 && jobBlockEnd > jobBlockStart && !app.slice(jobBlockStart, jobBlockEnd).includes('slice(0, 100)'), 'new-job scheduling still truncates customers to the first 100');
console.log('Northstar new-job customer search contract passed');
