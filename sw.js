const CACHE = 'patrimonet-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ignoră scheme-uri ne-HTTP
  if(!e.request.url.startsWith('http')) return;
  if(e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if(res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
