const CACHE_NAME = 'ncr-academy-v2-contenu-complet';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './assets/brand/logo-ncr-academy.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './src/styles/app.css',
  './src/app.js',
  './src/core/auth.js',
  './src/core/state.js',
  './src/core/tracking.js',
  './src/data/catalog.js',
  './src/data/qualopi.js',
  './documents/livret-accueil-stagiaire.md',
  './documents/convocation-formation.md',
  './documents/attestation-fin-formation.md',
  './documents/questionnaire-satisfaction.md',
  './documents/registre-tracabilite.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);
  const sameOrigin = requestURL.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }

  if (sameOrigin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => cached))
    );
  }
});
