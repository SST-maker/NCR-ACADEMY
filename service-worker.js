const CACHE_NAME = 'ncr-academy-v5-3-4-hotfix-launch-1';

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
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request, { cache: 'no-store' });
      } catch (error) {
        const cached = await caches.match('./index.html');
        return cached || new Response('<!doctype html><title>N.C.R Academy</title><p>Connexion impossible hors ligne. Recharge la page.</p>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      return await fetch(event.request, { cache: 'no-store' });
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw error;
    }
  })());
});
