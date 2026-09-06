const NORTHSTAR_SHELL_CACHE = 'northstar-shell-v3';
const NORTHSTAR_SHELLS = ['/index.html', '/technician.html'];
const NORTHSTAR_ASSETS = ['/styles.css', '/portal.css', '/northstar.webmanifest', '/tenant-config.js', '/data-repository.js', '/app.js', '/release-readiness-owner.js', '/plan-status-owner.js', '/search-pagination.js', '/estimate-media-owner.js', '/invoice-bill-to-owner.js', '/custom-report-owner.js', '/inventory-adjustment-owner.js', '/fleet-location-owner.js', '/fleet-maintenance-owner.js', '/location-picker.js', '/settings.js'];
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
