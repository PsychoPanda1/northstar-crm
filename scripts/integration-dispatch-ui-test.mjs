import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const required = [
  'data-integration-dispatch="messages"',
  'data-integration-dispatch="payments"',
  'repository.dispatchMessages(20)',
  'repository.dispatchPayments(20)',
  'data-operations-dispatch',
  "'LEAD HANDOFF': { method: 'dispatchLeads'",
  "DOCUMENTS: { method: 'dispatchDocuments'",
  'operationsButton.click()',
  'data-operations-refresh',
  'Refresh health',
  'data-record-pagination',
  'Load more records',
  'repository.listPage(state.type',
  'Load more requests',
  "repository.listPage('requests'",
  "new Set(['messages', 'calls'])",
  'Load more ${type}',
  "new Set(['materials', 'purchase-orders', 'inventory-transactions', 'assets', 'plans'])",
  "new Set(['payments', 'vehicles', 'financing-applications', 'job-costs', 'inventory-locations'])",
  'repository.listPage(type, { search, page, pageSize: 50 })',
  'Integration health is unavailable',
  'data-job-tracking-history',
  'repository.getJobLocationHistory',
  'Could not load technician tracking history',
  'data-bulk-assign',
  'data-bulk-select-visible',
  'Select visible jobs',
  'data-bulk-status',
  'data-bulk-invoice',
  'repository.bulkAssignJobs(jobIds, technician.trim())',
  'repository.bulkUpdateJobStatus(jobIds, status, note || \'\')',
  'repository.bulkInvoiceJobs(completed.map((job) => job.dataset.dispatchJob)',
  'const amounts = {}',
  'amounts[job.dataset.dispatchJob] = amount',
  'undefined, due, crypto.randomUUID(), lineItemsByJob, amounts',
  'data-route-order',
  'data-route-optimize',
  'repository.updateRouteOrder(date.trim(), technician.trim()',
  'repository.optimizeRoute(date.trim(), technician.trim()',
  'data-estimate-revisions',
  'repository.getEstimateRevisions(button.dataset.estimateRevisions)',
  'data-estimate-option-details',
  'repository.updateEstimateOptionDetails(estimate.id, options)',
  'data-invoice-action="schedule"',
  'data-invoice-action="view-schedule"',
  'repository.createPaymentSchedule(button.dataset.invoiceId',
  'repository.getPaymentSchedule(button.dataset.invoiceId)',
  'data-invoice-link-action',
  'repository.invoicePaymentLink(button.dataset.invoiceId)',
  'select-visible-leads',
  'select-visible-requests',
  'Clear visible ${view} selection',
  'Schedule service',
  'northstarScheduleCustomerId',
  'observeDialogSelection(button.dataset.customerId)',
  'Create estimate',
  'observeEstimateSelection(button.dataset.customerId)'
  ,'populateAllCustomers'
  ,'select.dataset.allCustomersLoaded'
  ,'customers.map((item) => `<option value="${escapeHtml(item.id)}">'
  ,'estimateSnapshot'
  ,'data-approved-estimate-scope'
  ,'APPROVED LINE ITEMS'
  ,"Jobs: 'dispatch'"
];
for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`integration dispatch UI wiring missing: ${snippet}`);
}
console.log('Northstar integration dispatch UI checks passed');
