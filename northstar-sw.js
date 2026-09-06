const NORTHSTAR_SHELL_CACHE = 'northstar-shell-v2';
const NORTHSTAR_SHELLS = ['/index.html', '/technician.html'];
const NORTHSTAR_OWNER_PATHS = ['/portal', '/portal/', '/index.html'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(NORTHSTAR_SHELL_CACHE).then((cache) => cache.addAll(NORTHSTAR_SHELLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('northstar-shell-') && key !== NORTHSTAR_SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !(NORTHSTAR_OWNER_PATHS.includes(url.pathname) || url.pathname === '/technician.html') || request.mode !== 'navigate') return;
  event.respondWith(fetch(new Request(request, { cache: 'no-store' })).catch(() => caches.match(url.pathname === '/technician.html' ? '/technician.html' : '/index.html')));
});
