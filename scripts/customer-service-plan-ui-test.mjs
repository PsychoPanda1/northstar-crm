import { readFile } from 'node:fs/promises';

const [html, source] = await Promise.all([
  readFile(new URL('../customer.html', import.meta.url), 'utf8'),
  readFile(new URL('../customer-service-plan-portal.js', import.meta.url), 'utf8')
]);

for (const snippet of [
  'customer-service-plan-portal.js',
  'id = \'customer-service-plan-dialog\'',
  '[data-action="schedule-plan-visit"]',
  '[data-plan-request="true"]',
  "'/api/public/customer-portal/service-plan-visit'",
  "'/api/public/customer-portal/service-plan-request'",
  'name="locationId"',
  'stopImmediatePropagation()'
]) {
  if (![html, source].some((text) => text.includes(snippet))) throw new Error(`Missing customer service-plan UI contract: ${snippet}`);
}

console.log('Northstar customer service-plan UI checks passed');
