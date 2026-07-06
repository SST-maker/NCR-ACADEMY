# Architecture V3

## Objectif

N.C.R Academy V3 est une PWA LMS mobile-first organisée autour de deux espaces distincts.

## Espace stagiaire

Le stagiaire voit uniquement le contenu utile à l’apprentissage : accueil, leçons, quiz, fiches mémo, documents et contact. Les consignes d’animation, les critères internes et les éléments de validation formateur ne sont pas affichés dans les leçons stagiaires.

## Espace formateur

Le formateur dispose d’un tableau de bord séparé contenant le suivi, les validations, les tickets, les documents, les paramètres techniques et le guide formateur. Le guide formateur centralise les objectifs, les activités, les critères de réussite et la traçabilité.

## Navigation

Le header est réduit à un logo centré et un bouton d’ouverture du menu. Le stagiaire dispose d’une barre inférieure fixe à quatre onglets. Le changement de formation et les actions secondaires passent par un volet latéral coulissant.

## Fichiers clés

- `index.html` : point d’entrée.
- `src/app.js` : rendu SPA, navigation, interactions et séparation des rôles.
- `src/styles/app.css` : design system Apple, mobile-first, glassmorphism et light/dark mode.
- `src/data/catalog.js` : catalogue pédagogique, quiz, fiches mémo et lexiques.
- `src/core/auth.js` : authentification de démonstration.
- `src/core/state.js` : état local.
- `src/core/tracking.js` : journal de traçabilité local.
- `service-worker.js` : cache offline basique.
