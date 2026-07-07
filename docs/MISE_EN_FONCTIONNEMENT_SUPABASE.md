# Mise en fonctionnement Supabase

## 1. Créer le projet

Crée un projet Supabase, puis récupère :

- Project URL
- anon public key

Ces deux valeurs vont dans `assets/app/supabase.config.js`.

## 2. Activer Auth

Dans Authentication, active la connexion par email et mot de passe.

## 3. Lancer le schéma

Dans SQL Editor, colle le contenu de `supabase/schema.sql` puis exécute.

Le script crée :

- profiles
- enrollments
- user_states
- tracking_events
- tickets
- training_documents
- buckets Storage
- règles RLS et Storage

## 4. Créer un formateur

Crée un utilisateur dans Authentication.
Copie son UID.
Ajoute un profil dans `profiles` avec :

- id : UID Auth
- email : email du compte
- full_name : nom affiché
- role : trainer

## 5. Créer un stagiaire

Crée un utilisateur dans Authentication.
Copie son UID.
Ajoute un profil dans `profiles` avec :

- id : UID Auth
- email : email du compte
- full_name : nom affiché
- role : student

Puis ajoute ses formations dans `enrollments`.

## 6. Tester les documents

Connecte-toi avec le formateur, va dans Documents, envoie un PDF.

- Si tu choisis un stagiaire, le fichier va dans `documents-prives`.
- Si tu ne choisis pas de stagiaire, le fichier va dans `livrets-formation`.

Connecte-toi avec le stagiaire pour vérifier l'accès.
