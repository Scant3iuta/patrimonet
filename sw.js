const CACHE_NAME = 'patrimonet-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/state.js',
  './js/supabase_hooks.js',
  './js/ui_core.js',
  './js/app_logic.js',
  './js/ai_exports.js'
];

// Install: Cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: Cleanup old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate or Cache-First
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Exclude Supabase Auth and API calls from static cache
  if (e.request.url.includes('supabase.co')) {
    return; // Let them handle via network
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networked = fetch(e.request).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return res;
      }).catch(() => null);

      return cached || networked;
    })
  );
});
