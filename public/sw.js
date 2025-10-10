const CACHE_NAME = 'axioris-cache-v3';
const urlsToCache = ['/logo.svg', '/fonts/roboto.woff2'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  if (req.mode === 'navigate' || url.pathname.startsWith('/account') || url.pathname.startsWith('/auth') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          return networkResponse;
        })
        .catch(() => caches.match(req).then(cached => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(networkRes => {
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return networkRes;
    }))
  );
});
