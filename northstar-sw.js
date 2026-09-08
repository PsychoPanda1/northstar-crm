const NORTHSTAR_SHELL_CACHE = 'northstar-shell-v7';
const NORTHSTAR_SHELLS = ['/index.html', '/technician.html'];
const NORTHSTAR_ASSETS = ['/styles.css', '/customer-support-dialog.js', '/team-member-dialog.js', '/route-optimization-dialog.js', '/next-actions.css', '/portal.css', '/northstar.webmanifest', '/tenant-config.js', '/data-repository.js', '/app.js', '/release-readiness-owner.js', '/payroll-operations-owner.js', '/payroll-integration-owner.js', '/integration-recovery-owner.js', '/analytics-history-owner.js', '/plan-status-owner.js', '/search-pagination.js', '/estimate-media-owner.js', '/invoice-bill-to-owner.js', '/invoice-bill-to-dialog.js', '/custom-report-owner.js', '/service-agreement-report-owner.js', '/vendor-bills-owner.js', '/inventory-adjustment-owner.js', '/fleet-location-owner.js', '/fleet-maintenance-owner.js', '/location-picker.js', '/settings.js', '/conversation-owner.js', '/conversation-dialog.js', '/request-dialog.js', '/request-convert-dialog.js', '/job-cost-dialog.js', '/lead-dialog.js', '/lead-convert-dialog.js', '/estimate-schedule-dialog.js', '/plan-renew-dialog.js', '/dispatch-reschedule-dialog.js', '/call-recordings-owner.js', '/service-plan-request-owner.js', '/inventory-provider-retry-owner.js', '/accounting-provider-retry-owner.js', '/payroll-runs-owner.js', '/structured-form-owner.js', '/crew-assignment-owner.js', '/dispatch-assignment-owner.js', '/dispatch-bulk-owner.js', '/dispatch-assignment-dialog.js', '/dispatch-priority-dialog.js', '/service-switcher-owner.js', '/user-access-owner.js', '/customer-pricing-owner.js', '/customer-tax-owner.js', '/customer-preferences-owner.js', '/customer-tags-owner.js', '/customer-location-owner.js', '/invoice-payment-plan-owner.js', '/invoice-payment-owner.js', '/job-complete-dialog.js', '/payment-refund-owner.js', '/technician-payment-owner.js', '/technician-material-owner.js'];
NORTHSTAR_ASSETS.push('/catalog-editor-dialog.js');
NORTHSTAR_ASSETS.push('/booking-catalog-selection.js');
NORTHSTAR_ASSETS.push('/call-booking-dialog.js');
NORTHSTAR_ASSETS.push('/capacity-plan-dialog.js');
NORTHSTAR_ASSETS.push('/team-time-off-dialog.js');
NORTHSTAR_ASSETS.push('/vehicle-status-dialog.js');
NORTHSTAR_ASSETS.push('/vehicle-maintenance-dialog.js', '/dispatch-bulk-dialog.js', '/dispatch-bulk-invoice-dialog.js', '/dispatch-route-order-dialog.js', '/dispatch-route-maps-dialog.js', '/dispatch-route-calendar-dialog.js', '/report-range-dialog.js', '/report-export-range-dialog.js', '/estimate-option-details-dialog.js');
NORTHSTAR_ASSETS.push('/vehicle-assignment-dialog.js');
NORTHSTAR_ASSETS.push('/job-invoice-dialog.js');
NORTHSTAR_ASSETS.push('/call-outcome-dialog.js');
NORTHSTAR_ASSETS.push('/receivables-reminder-dialog.js');
NORTHSTAR_ASSETS.push('/estimate-line-items-dialog.js');
NORTHSTAR_ASSETS.push('/estimate-send-dialog.js');
NORTHSTAR_ASSETS.push('/plan-reminder-dialog.js');
NORTHSTAR_ASSETS.push('/estimate-reminder-dialog.js');
NORTHSTAR_ASSETS.push('/reactivation-campaign-dialog.js');
NORTHSTAR_ASSETS.push('/task-dialog.js');
NORTHSTAR_ASSETS.push('/asset-dialog.js');
NORTHSTAR_ASSETS.push('/activity-dialog.js');
NORTHSTAR_ASSETS.push('/commission-rate-owner.js');
NORTHSTAR_ASSETS.push('/customer-tax-owner.js');
NORTHSTAR_ASSETS.push('/customer-merge-owner.js');
NORTHSTAR_ASSETS.push('/technician-scorecard-owner.js');
NORTHSTAR_ASSETS.push('/inventory-replenishment-owner.js');
const NORTHSTAR_OWNER_PATHS = ['/portal', '/portal/', '/index.html'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(NORTHSTAR_SHELL_CACHE).then((cache) => cache.addAll([...NORTHSTAR_SHELLS, ...NORTHSTAR_ASSETS])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('northstar-shell-') && key !== NORTHSTAR_SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (NORTHSTAR_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) caches.open(NORTHSTAR_SHELL_CACHE).then((cache) => cache.put(request, response.clone())); return response; })));
    return;
  }
  if (!(NORTHSTAR_OWNER_PATHS.includes(url.pathname) || url.pathname === '/technician.html') || request.mode !== 'navigate') return;
  event.respondWith(fetch(new Request(request, { cache: 'no-store' })).catch(() => caches.match(url.pathname === '/technician.html' ? '/technician.html' : '/index.html')));
});
