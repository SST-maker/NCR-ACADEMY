# Architecture technique

```text
ncr-academy-pwa/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── favicon.ico
├── assets/
│   ├── brand/logo-ncr-academy.png
│   └── icons/
├── src/
│   ├── app.js
│   ├── core/
│   │   ├── auth.js
│   │   ├── state.js
│   │   └── tracking.js
│   ├── data/
│   │   ├── catalog.js
│   │   └── qualopi.js
│   └── styles/app.css
├── documents/
├── docs/
└── README.md
```

## Choix technique

Vanilla HTML/CSS/JavaScript ES Modules pour éviter un build obligatoire. Cette base est directement compatible GitHub Pages et peut ensuite migrer vers Vite/React si besoin.

## PWA

- Manifest complet.
- Favicon + icônes PWA générés depuis le logo fourni.
- Service Worker avec cache de l’app shell.
- Navigation SPA via hash routing pour compatibilité GitHub Pages.

## Qualiopi-ready

La base prévoit : objectifs visibles, suivi de progression, scores, tickets, documents, exports de traçabilité. Pour une certification réelle, les traces devront être envoyées côté serveur avec authentification et horodatage fiable.
