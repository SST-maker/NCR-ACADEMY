-- N.C.R Academy V5.2 — Correctif connexion Supabase
-- À exécuter dans Supabase > SQL Editor si la connexion Auth fonctionne mais que l'app refuse l'accès.

alter table if exists public.profiles
  add column if not exists name text;

alter table if exists public.profiles
  add column if not exists courses text[] not null default '{}';

update public.profiles
set name = coalesce(name, full_name, email)
where name is null;

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.enrollments to authenticated;

drop policy if exists "profiles_read_own_or_trainer" on public.profiles;
drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own_or_trainer" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "enrollments_read_own_or_trainer" on public.enrollments;
drop policy if exists "enrollments_read_self" on public.enrollments;
create policy "enrollments_read_self"
on public.enrollments
for select
to authenticated
using (user_id = auth.uid());

-- Test conseillé après exécution :
-- select id, email, full_name, name, role, courses from public.profiles;
