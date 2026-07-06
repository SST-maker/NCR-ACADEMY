# Mise en fonctionnement réelle de N.C.R Academy

Cette V4 peut fonctionner de deux manières.

## 1. Mode démo immédiat

Sans configuration Firebase, l’application reste utilisable sur GitHub Pages avec les comptes de démonstration. Ce mode permet de vérifier le design, la navigation, les leçons, les quiz, les fiches mémo, les tickets et les documents inclus localement.

## 2. Mode production avec Firebase

Pour transformer l’application en LMS réellement exploitable, il faut connecter Firebase Authentication et Cloud Firestore.

### Étape A — Créer le projet Firebase

Créer un projet Firebase, ajouter une application Web, puis récupérer l’objet de configuration Web. Reporter ces valeurs dans `assets/app/firebase.config.js` et passer `enabled` à `true`.

### Étape B — Activer la connexion email / mot de passe

Dans Firebase Authentication, activer le fournisseur Email/Password, puis créer les comptes stagiaires et formateurs. Vérifier aussi les domaines autorisés de Firebase Authentication : le domaine GitHub Pages ou ton domaine personnalisé doit être autorisé pour que la connexion fonctionne en ligne.

### Étape C — Créer les profils utilisateurs Firestore

Dans Cloud Firestore, créer une collection `users`. Chaque document doit avoir comme identifiant l’UID Firebase du compte Authentication correspondant.

Champs attendus :

- `name` : nom affiché dans l’application
- `email` : email du compte
- `role` : `student` ou `trainer`
- `courses` : liste des formations accessibles

Identifiants de formation disponibles :

- `communication-digitale`
- `outils-bureautiques`
- `litiges-clients`
- `community-manager`
- `acteur-sst`

### Étape D — Publier les règles Firestore

Copier le contenu de `firebase/firestore.rules` dans l’onglet Rules de Cloud Firestore, puis publier. Les règles limitent l’accès aux données selon l’utilisateur connecté et son rôle.

### Étape E — Tester

Tester dans cet ordre :

1. connexion stagiaire réelle ;
2. accès aux formations autorisées ;
3. validation d’une leçon ;
4. passage d’un quiz ;
5. création d’un ticket ;
6. connexion formateur ;
7. lecture du tableau de bord ;
8. export du journal de traçabilité.

## Collections Firestore utilisées

- `users` : profils, rôle et formations accessibles
- `userStates` : progression, scores, certificats et tickets synchronisés
- `tickets` : tickets stagiaires centralisés
- `trackingEvents` : journal de traçabilité
- `documents` : documents optionnels à afficher dans l’espace documents

## Sécurité

Ne pas stocker de mots de passe dans le code. Les anciens comptes de démonstration restent volontairement limités au mode local et ne sont pas une authentification de production. Pour une utilisation réelle, créer les comptes dans Firebase Authentication.
