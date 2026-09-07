import { readFile } from 'node:fs/promises';

const customer = await readFile(new URL('../customer.html', import.meta.url), 'utf8');
for (const snippet of [
  'visitsAvailableToSchedule',
  'No visits available',
  'service-plan-visit',
  'locationId',
  'Choose a service location',
  'northstarPortalRetryKey'
]) {
  if (!customer.includes(snippet)) throw new Error(`customer plan visit UI wiring missing: ${snippet}`);
}
console.log('Northstar customer plan visit UI checks passed');
