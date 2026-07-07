# N.C.R Academy — V5.4 Clean

Version complète propre à republier directement sur GitHub Pages.

## Important après upload

Renseigne `assets/app/supabase.config.js` avec ton nouveau projet Supabase :

```js
url: 'https://TON-PROJET.supabase.co',
anonKey: 'TA_PUBLISHABLE_KEY',
publishableKey: 'TA_PUBLISHABLE_KEY',
apiKey: 'TA_PUBLISHABLE_KEY'
```

Puis passe :

```js
enabled: true,
allowDemoFallback: false
```

## Ce que contient cette version

- PWA mobile-first complète
- Supabase No-CDN
- Sessions formateur
- Création de session avec rattachement stagiaires
- Génération automatique de convocations PDF
- Modèle de convocation premium N.C.R Solutions
- Espace Documents épuré, sans anciens modèles locaux
- Service worker safe sans cache agressif
