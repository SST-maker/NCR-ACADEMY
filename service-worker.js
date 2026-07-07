const CACHE_NAME = 'ncr-academy-v5-3-4-premium-convocations-safe-2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './assets/app/styles/app.css',
  './assets/app/app.js',
  './assets/app/core/auth.js',
  './assets/app/core/state.js',
  './assets/app/core/tracking.js',
  './assets/app/core/backend.js',
  './assets/app/supabase.config.js',
  './assets/app/data/catalog.js',
  './assets/app/data/qualopi.js',
  './assets/brand/logo-ncr-academy.png',
  './assets/brand/logo-ncr-solutions.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const asset of CORE_ASSETS) {
      try {
        const response = await fetch(asset, { cache: 'reload' });
        if (response && response.ok) await cache.put(asset, response.clone());
      } catch (error) {
        // Missing or blocked optional assets must never break installation.
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => key === CACHE_NAME ? null : caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        await cache.put('./index.html', response.clone());
        return response;
      } catch (error) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  if (!sameOrigin) return;

  const networkFirst = [
    '/assets/app/supabase.config.js',
    '/assets/app/app.js',
    '/assets/app/core/backend.js',
    '/assets/app/core/auth.js',
    '/service-worker.js',
    '/manifest.webmanifest'
  ].some(path => requestUrl.pathname.endsWith(path));

  if (networkFirst) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        if (response && response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        const cached = await caches.match(event.request);
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      if (response && response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
