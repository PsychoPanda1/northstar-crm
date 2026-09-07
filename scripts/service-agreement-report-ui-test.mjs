import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ui = readFileSync(`${root}/service-agreement-report-owner.js`, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(ui.includes('data-agreement-filters'), 'agreement report filters are missing');
assert(ui.includes('repository.getServiceAgreementReport({ status: filters.status'), 'agreement report filters are not sent to the API');
assert(ui.includes('repository.exportRecords(\'service-agreements\''), 'agreement report CSV export is missing');
assert(ui.includes('Estimated cost') && ui.includes('Margin'), 'agreement report profitability details are missing');
console.log('Northstar service agreement report UI contract passed');
