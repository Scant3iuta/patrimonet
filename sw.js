const CACHE = 'patrimonet-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  // Tot timpul cere de la rețea - bypass cache pentru mediul de dezvoltare
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
