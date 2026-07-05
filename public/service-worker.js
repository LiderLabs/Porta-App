const CACHE_NAME = 'porta-app-1783284542308';
const urlsToCache = ['/', '/Porta.png', '/Porta_fav.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => { if (n !== CACHE_NAME) return caches.delete(n); }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first for page navigations so index.html (and its JS bundle refs) is always fresh
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for everything else (images, static assets)
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
