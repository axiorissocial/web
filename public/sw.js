const CACHE_NAME = 'axioris-cache-v1';
const urlsToCache = ['/logo.svg', '/fonts/roboto.woff2', '/account/login', '/account/register'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
