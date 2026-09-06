const CUSTOMER_LINKED_COLLECTIONS = ['locations', 'assets', 'jobs', 'estimates', 'invoices', 'payments', 'paymentSchedules', 'paymentIntents', 'financingApplications', 'plans', 'activities', 'messages', 'requests', 'reviews', 'laborEntries'];

const linkedToCustomer = (item, customerId) => item?.customerId === customerId || item?.customer?.id === customerId;

// Returns a tenant-scoped, export-safe copy for a customer access request.
// Provider credentials, session state, and webhook secrets are never part of saved records.
export const customerDataExportFor = (saved, customerId) => {
  const customer = (saved.customers || []).find((item) => item.id === customerId);
  if (!customer) return null;
  const collections = Object.fromEntries(CUSTOMER_LINKED_COLLECTIONS.map((collection) => [
    collection,
    (saved[collection] || []).filter((item) => linkedToCustomer(item, customerId) || (collection === 'jobs' && item.customer === customer.name)).map((item) => structuredClone(item))
  ]));
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), customer: structuredClone(customer), collections, counts: Object.fromEntries(Object.entries(collections).map(([collection, items]) => [collection, items.length])) };
};
