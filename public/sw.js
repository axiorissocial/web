const CACHE_NAME = 'axioris-cache-v8';
const urlsToCache = ['/logo.svg', '/fonts/roboto.woff2'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 🧠 Ignore cross-origin requests (e.g. backend APIs)
  if (url.origin !== self.location.origin) {
    return; // Let the browser handle it normally
  }

  // Network-first for key routes (internal only)
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/uploads') ||
    request.mode === 'navigate'
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful internal responses
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for all other GET requests
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
