const CACHE_NAME = 'ncr-academy-v5-4-no-flash';

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
// The browser loads files directly from GitHub Pages to avoid refresh loops and flashing.
