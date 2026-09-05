const NORTHSTAR_FIELD_CACHE = 'northstar-field-shell-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(NORTHSTAR_FIELD_CACHE).then((cache) => cache.add('/technician.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname !== '/technician.html') return;
  event.respondWith(fetch(request).catch(() => caches.match('/technician.html')));
});
