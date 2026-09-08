import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const snippet of [
  'name="estimateCustomerSearch"',
  'name="planCustomerSearch"',
  'estimateCustomerSearch.oninput',
  'planCustomerSearch.oninput',
  "repository.listPage('customers'",
  'pageSize: 50',
  'No matching customers'
]) {
  assert(app.includes(snippet), `Expected customer search marker: ${snippet}`);
}

const estimateStart = app.indexOf('const estimateCustomerSearch =');
const estimateEnd = app.indexOf("document.querySelector('#add-estimate')", estimateStart);
assert(estimateStart >= 0 && estimateEnd > estimateStart, 'Estimate customer search handler is missing');
assert(!app.slice(estimateStart, estimateEnd).includes('slice(0, 100)'), 'Estimate customer search still caps the first 100 customers');

const planStart = app.indexOf('const planCustomerSearch =');
const planEnd = app.indexOf('planForm.elements.service.value', planStart);
assert(planStart >= 0 && planEnd > planStart, 'Plan customer search handler is missing');
assert(!app.slice(planStart, planEnd).includes('slice(0, 100)'), 'Plan customer search still caps the first 100 customers');

assert(app.includes("dialog.querySelector('[name=\"customerSearch\"], [name=\"estimateCustomerSearch\"], [name=\"planCustomerSearch\"]')"), 'Legacy all-customer refresh must skip searchable dialogs');
console.log('New estimate and service-plan customer search contract passed.');
