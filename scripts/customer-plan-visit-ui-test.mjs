import { readFile } from 'node:fs/promises';

const customer = await readFile(new URL('../customer.html', import.meta.url), 'utf8');
const owner = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const repository = await readFile(new URL('../data-repository.js', import.meta.url), 'utf8');
for (const snippet of [
  'visitsAvailableToSchedule',
  'No visits available',
  'service-plan-visit',
  'locationId',
  'Choose a service location',
  'customer-portal/availability',
  'catalogItemId',
  'northstarPortalRetryKey'
]) {
  if (!customer.includes(snippet)) throw new Error(`customer plan visit UI wiring missing: ${snippet}`);
}
for (const snippet of ['billingSchedule', 'Amount per billing period', 'Monthly', 'Every other month', 'Quarterly', 'Biannual', 'Annual', 'Upfront', 'Time of service', 'renewalAt', 'visitsIncluded', 'autoRenew', 'Auto-renew agreement']) {
  if (!owner.includes(snippet)) throw new Error(`owner service-plan billing UI wiring missing: ${snippet}`);
}
for (const snippet of ['billingSchedule', 'renewalAt', 'autoRenew', 'Auto-renew off']) {
  if (!customer.includes(snippet)) throw new Error(`customer agreement terms UI wiring missing: ${snippet}`);
}
for (const snippet of ['createPlanInvoice', 'billPlanCycle', 'data-plan-billing-action', 'Invoice current period', 'plan-billing-cycle', 'Bill due plans']) {
  if (!owner.includes(snippet)) throw new Error(`owner service-plan invoicing UI wiring missing: ${snippet}`);
}
if (!repository.includes('billingSchedule = \'Monthly\'') || !repository.includes('options = {}') || !repository.includes('autoRenew: options.autoRenew') || !repository.includes('visitsIncluded: options.visitsIncluded')) throw new Error('repository service-plan agreement wiring missing');
console.log('Northstar customer plan visit UI checks passed');
