# Supabase — N.C.R Academy V5

Cette version utilise Supabase pour les comptes, les rôles, les documents privés, les tickets, les scores et la traçabilité.

## Mise en route

1. Créer un projet Supabase.
2. Activer Auth avec Email/Password.
3. Ouvrir SQL Editor.
4. Coller et exécuter `schema.sql`.
5. Créer les utilisateurs dans Authentication.
6. Pour chaque utilisateur, créer son profil dans `profiles` avec le même UID que dans Auth.
7. Ajouter les formations dans `enrollments` pour les stagiaires.
8. Copier l'URL du projet et la clé `anon public` dans `assets/app/supabase.config.js`.
9. Passer `enabled` à `true`.
10. Quand les tests sont validés, passer `allowDemoFallback` à `false`.

## Identifiants de formations

- `communication-digitale`
- `outils-bureautiques`
- `litiges-clients`
- `community-manager`
- `acteur-sst`

## Documents

- `documents-prives` : convocations et attestations nominatives.
- `livrets-formation` : livrets et supports visibles par les stagiaires inscrits à la formation.

Les fichiers ne sont pas publics. L'application demande une URL signée temporaire lorsque l'utilisateur a le droit de consulter le fichier.
