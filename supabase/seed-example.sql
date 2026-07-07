-- Exemple à adapter après création des utilisateurs dans Supabase Auth.
-- Remplace les UUID par les vrais UID affichés dans Authentication > Users.

insert into public.profiles (id, email, full_name, role, courses)
values
  ('00000000-0000-0000-0000-000000000001', 'formateur@ncr.demo', 'Formateur NCR', 'trainer', array['communication-digitale','outils-bureautiques','litiges-clients','community-manager','acteur-sst']),
  ('00000000-0000-0000-0000-000000000002', 'stagiaire@ncr.demo', 'Stagiaire Démo', 'student', array['acteur-sst','outils-bureautiques'])
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  courses = excluded.courses,
  updated_at = now();

insert into public.enrollments (user_id, course_id, status)
values
  ('00000000-0000-0000-0000-000000000002', 'acteur-sst', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'outils-bureautiques', 'active')
on conflict (user_id, course_id) do update set status = excluded.status;
