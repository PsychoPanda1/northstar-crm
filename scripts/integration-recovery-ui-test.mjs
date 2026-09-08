import { readFile } from 'node:fs/promises';

const [html, script, serviceWorker, repository] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../integration-recovery-owner.js', import.meta.url), 'utf8'),
  readFile(new URL('../northstar-sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../data-repository.js', import.meta.url), 'utf8')
]);
for (const snippet of ['integration-recovery-owner.js', 'data-integration-recovery-card', 'data-integration-recovery', 'retryLeadProvider', 'retryMessage', 'retryPaymentIntent', 'retryInventory', 'retryAccounting', 'retryDocumentDelivery', 'retryPayrollRun', 'failedItems', '/api/technician/offline-sync/review', '/api/technician/offline-sync/discard', "offline: ['owner', 'dispatcher']"]) {
  if (!html.includes(snippet) && !script.includes(snippet) && !repository.includes(snippet)) throw new Error(`integration recovery contract missing: ${snippet}`);
}
for (const role of ["lead: ['owner', 'dispatcher']", "message: ['owner', 'dispatcher']", "payment: ['owner', 'accountant']", "inventory: ['owner', 'dispatcher', 'accountant']", "accounting: ['owner', 'accountant']", "document: ['owner', 'dispatcher', 'accountant']", "payroll: ['owner', 'accountant']"]) {
  if (!script.includes(role)) throw new Error(`integration recovery role boundary missing: ${role}`);
}
if (!serviceWorker.includes("'/integration-recovery-owner.js'") || !serviceWorker.includes('northstar-shell-v16')) throw new Error('integration recovery asset must remain installable offline');
console.log('Northstar integration recovery UI checks passed');
