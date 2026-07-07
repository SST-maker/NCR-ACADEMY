const CACHE_NAME = 'ncr-academy-v5-3-4-premium-convocations';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './logo-ncr-academy.png',
  './assets/logo-ncr-academy.png',
  './brand/logo-ncr-academy.png',
  './assets/brand/logo-ncr-academy.png',
  './assets/brand/logo-ncr-academy-full-source.png',
  './assets/brand/logo-ncr-solutions.png',
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/app/styles/app.css',
  './assets/app/app.js',
  './assets/app/core/auth.js',
  './assets/app/core/state.js',
  './assets/app/core/tracking.js',
  './assets/app/core/backend.js',
  './assets/app/supabase.config.js',
  './assets/app/data/catalog.js',
  './assets/app/data/qualopi.js',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (response && response.ok) {
        await cache.put(asset, response);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);
  const sameOrigin = requestURL.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', networkResponse.clone());
        return networkResponse;
      } catch (error) {
        return caches.match('./index.html') || caches.match('./');
      }
    })());
    return;
  }

  if (!sameOrigin) return;

  const networkFirstFiles = [
    '/assets/app/supabase.config.js',
    '/assets/app/app.js',
    '/assets/app/core/backend.js',
    '/assets/app/core/auth.js',
    '/manifest.webmanifest',
    '/service-worker.js'
  ];

  const useNetworkFirst = networkFirstFiles.some(path => requestURL.pathname.endsWith(path));

  if (useNetworkFirst) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'reload' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        return caches.match(event.request);
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
      cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      return cached;
    }
  })());
});
