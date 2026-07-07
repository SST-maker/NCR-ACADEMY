# N.C.R Academy — PWA V5.3 Supabase No-CDN Fix

Version opérationnelle orientée Supabase : comptes réels, rôles stagiaire/formateur, progression, tickets, traçabilité et stockage sécurisé des documents.

## Ce qui change en V5

- Connexion Supabase Auth prête à brancher.
- Tables Supabase pour profils, inscriptions, progression, tickets, traces et documents.
- Supabase Storage pour convocations, attestations et livrets.
- Upload formateur depuis l'onglet Documents.
- Accès stagiaire sécurisé aux documents personnels et aux livrets de ses formations.
- Service worker mis à jour pour forcer le rafraîchissement de la PWA.

## Mise en ligne GitHub Pages

Dépose le contenu de ce dossier à la racine du dépôt GitHub Pages.

## Configuration Supabase

1. Créer le projet Supabase.
2. Activer Authentication > Email/Password.
3. Aller dans SQL Editor.
4. Exécuter `supabase/schema.sql`.
5. Créer les comptes dans Authentication > Users.
6. Créer les profils dans `profiles` avec les UID réels.
7. Ajouter les formations dans `enrollments`.
8. Ouvrir `assets/app/supabase.config.js`.
9. Remplir `url` et `anonKey`.
10. Passer `enabled` à `true`.
11. Une fois les tests terminés, passer `allowDemoFallback` à `false`.

## Formations disponibles

- communication-digitale
- outils-bureautiques
- litiges-clients
- community-manager
- acteur-sst

## Documents

Deux buckets sont créés par le script SQL :

- `documents-prives` pour les convocations et attestations nominatives.
- `livrets-formation` pour les documents partagés par formation.

Les documents privés ne sont pas rendus publics. L'application génère une URL signée temporaire seulement si l'utilisateur connecté a le droit d'accès.

## V5.3 Supabase No-CDN Fix

Cette version renforce la connexion Supabase : lecture robuste des clés `anonKey`, `publishableKey`, `apiKey` ou `key`, envoi explicite des headers Supabase, diagnostic intégré sur l’écran de connexion, messages d’erreur plus précis et service worker renouvelé.

Sur l’écran de connexion, le bouton de diagnostic permet de savoir si le blocage vient de l’authentification, du profil, des règles RLS ou de la configuration.


## V5.3
Cette version supprime la dépendance au CDN Supabase JS pour la connexion. Elle utilise les API REST Supabase directement, ce qui corrige les erreurs Safari du type “Auth Supabase : Load failed”.
