const CACHE_NAME = 'ncr-academy-v5-3-4-blank-fix-2';

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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => {
    if (event.request.mode === 'navigate') {
      return await caches.match('./index.html') || Response.error();
    }
    return await caches.match(event.request) || Response.error();
  }));
});
