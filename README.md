# N.C.R Academy PWA — V4 opérationnelle

Application LMS PWA mobile-first pour N.C.R Solutions.

## Statut de cette version

Cette V4 garde la version statique prête pour GitHub Pages et ajoute un connecteur Firebase prêt à activer pour passer en fonctionnement réel.

## Lancement local

Ouvrir le dossier avec un serveur local :

- VS Code Live Server
- `python3 -m http.server 5173`
- ou tout hébergement statique compatible HTTPS

## Déploiement GitHub Pages

Déposer tout le contenu du dossier à la racine du dépôt GitHub. Garder `.nojekyll`.

## Comptes de démonstration

- Stagiaire : `stagiaire@ncr.demo` / `ncr2026`
- Formateur : `formateur@ncr.demo` / `ncr2026`

Ces comptes sont uniquement locaux. Pour des comptes réels, utiliser Firebase Authentication.

## Activation production

1. Créer un projet Firebase.
2. Activer Authentication Email/Password.
3. Créer les comptes stagiaires et formateurs.
4. Créer les documents de profil dans Firestore, collection `users`.
5. Renseigner `assets/app/firebase.config.js`.
6. Passer `firebaseRuntime.enabled` à `true`.
7. Publier les règles présentes dans `firebase/firestore.rules`.
8. Pousser à nouveau le projet sur GitHub.

Le guide détaillé est dans `docs/MISE_EN_FONCTIONNEMENT.md`.

## Données synchronisées avec Firebase

- Connexion réelle des utilisateurs
- Rôle stagiaire / formateur
- Formations accessibles par compte
- Progression
- Scores quiz
- Certificats de réussite
- Tickets internes
- Journal de traçabilité
- Documents distants optionnels

## Important

Le contenu SST est un support de révision. Il ne remplace pas la formation ni l’évaluation officielle par un formateur habilité.
