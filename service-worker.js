const CACHE_NAME = 'ncr-academy-v6-2-documents-structures';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Intentionally no fetch interception.
// GitHub Pages serves fresh files directly, avoiding cache loops and flashing.
