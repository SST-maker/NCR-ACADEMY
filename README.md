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


## V4.1 Logo Academy

Cette version intègre le nouveau logo N.C.R Academy dans l’interface, le favicon et les icônes PWA destinées à l’installation mobile.


## Correction V4.2 Service Worker

Cette version ajoute l'enregistrement réel du Service Worker dans `index.html` et renforce le cache PWA pour GitHub Pages. Après publication, vider le cache du navigateur ou réinstaller l'app PWA si une ancienne version reste affichée.

## Correctif V4.3 images
Cette version corrige l’affichage du logo et des icônes sur GitHub Pages en utilisant des chemins d’assets robustes, un cache PWA renouvelé et des copies de secours du logo pour éviter les erreurs de chemin lors du déploiement.
