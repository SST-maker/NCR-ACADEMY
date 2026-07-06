# N.C.R Academy PWA

Base PWA/LMS prête pour GitHub Pages : connexion démo, espace stagiaire, espace formateur, parcours multi-formations, quiz, fiches mémo, tickets, documents et journal de traçabilité local.

## Démarrage rapide

```bash
# Depuis le dossier du projet
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Comptes démo :
- Stagiaire : `stagiaire@ncr.demo` / `ncr2026`
- Formateur : `formateur@ncr.demo` / `ncr2026`

## Déploiement GitHub Pages

1. Pousser tout le dossier dans le dépôt GitHub.
2. Aller dans `Settings > Pages`.
3. Source : branche `main`, dossier `/root`.
4. Ouvrir l’URL GitHub Pages générée.

## À brancher pour une version production

- Authentification réelle : Firebase Auth, Supabase Auth ou backend Node.
- Base de données : Firestore, Supabase Postgres ou autre.
- Stockage documents : Firebase Storage, Supabase Storage ou S3 compatible.
- Génération PDF d’attestations : Cloud Function ou endpoint serveur.
- Exports Qualiopi : stockage horodaté côté serveur, pas seulement localStorage.

## Important documents sensibles

Le dépôt ne contient pas les PDF sources complets afin d’éviter d’exposer des documents sensibles ou protégés dans un dépôt public. Les dossiers `documents/` et `docs/` sont prêts à recevoir des fichiers autorisés à la diffusion.
