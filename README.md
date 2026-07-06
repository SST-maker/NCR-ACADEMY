# N.C.R Academy PWA — V3 Mobile-First

Application LMS Progressive Web App pour N.C.R Solutions.

## V3

Cette version corrige l’ergonomie mobile et sépare strictement les espaces stagiaire et formateur.

- Header simplifié avec logo centré.
- Navigation stagiaire inspirée iOS avec barre inférieure fixe : Accueil, Leçons, Quiz, Mémo.
- Volet latéral glassmorphism pour changer de formation et accéder aux éléments secondaires.
- Espace stagiaire nettoyé : leçons, notions, cas pratiques, quiz et fiches mémo uniquement.
- Espace formateur séparé : suivi, validations, tickets, documents, paramètres et guide formateur.
- Service worker et manifest PWA conservés pour GitHub Pages.

## Comptes de démonstration

- Stagiaire : stagiaire@ncr.demo / ncr2026
- Formateur : formateur@ncr.demo / ncr2026

## Déploiement GitHub Pages

Déposer tous les fichiers à la racine du dépôt, puis activer GitHub Pages sur la branche principale. Le fichier `.nojekyll` est inclus pour éviter les transformations automatiques de GitHub Pages.

## Production

Pour une exploitation réelle, brancher une authentification sécurisée, une base distante pour les traces, et un stockage documentaire privé.


## Correctif V3.2 GitHub Pages

Cette version retire entièrement le dossier `src` pour éviter les problèmes de dépôt ou de publication rencontrés lors de l'import GitHub. Les fichiers applicatifs sont maintenant dans `assets/app/`, ce qui est compatible avec GitHub Pages, Jekyll désactivé via `.nojekyll`, et un déploiement statique classique.

À pousser sur GitHub : tous les fichiers situés à la racine de ce dossier, pas le dossier parent du ZIP.


## V3.2 Responsive Mobile

Cette version renforce la lisibilité téléphone : cartes plus compactes, barre basse ajustée, header réduit, tiroir latéral optimisé, textes mieux contenus et cache PWA mis à jour.
