# Mise en fonctionnement — N.C.R Academy V5

Cette version fonctionne en mode local tant que Supabase n'est pas configuré. Pour passer en production, utilise Supabase Auth, Database et Storage.

## Étapes principales

1. Créer le projet Supabase.
2. Activer Email/Password dans Authentication.
3. Exécuter `supabase/schema.sql` dans SQL Editor.
4. Créer les utilisateurs dans Authentication.
5. Créer les profils dans `profiles` avec les UID réels.
6. Ajouter les inscriptions dans `enrollments`.
7. Renseigner `assets/app/supabase.config.js`.
8. Passer `enabled` à `true`.
9. Publier sur GitHub Pages.
10. Tester formateur, stagiaire, quiz, tickets et documents.

## Rôles

- `student` : accès stagiaire limité à ses formations, sa progression, ses tickets et ses documents.
- `trainer` : accès formateur, documents, suivi, tickets et traces.

## Documents

Le formateur ajoute les documents depuis l'application.

- Document avec stagiaire sélectionné : document personnel dans `documents-prives`.
- Document sans stagiaire sélectionné : document de formation dans `livrets-formation`.

L'accès se fait par URL signée temporaire. Les fichiers ne sont pas publics.

## Production

Quand tout fonctionne, passe `allowDemoFallback` à `false` dans `assets/app/supabase.config.js` pour désactiver les comptes démo locaux.
