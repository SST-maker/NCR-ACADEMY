-- N.C.R Academy — Schéma Supabase V5
-- À exécuter dans Supabase SQL Editor après création du projet.
-- L'application utilise Auth, Database, Storage et RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('student', 'trainer')) default 'student',
  courses text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  status text not null check (status in ('active', 'completed', 'paused')) default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.user_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  role text,
  state jsonb not null default '{}'::jsonb,
  reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  role text,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  url text,
  user_agent text
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  author_email text,
  subject text not null,
  message text not null,
  status text not null default 'ouvert',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  name text,
  type text not null,
  course_id text,
  target_user_id uuid references public.profiles(id) on delete cascade,
  bucket text not null,
  storage_path text not null,
  status text not null default 'active',
  visibility text not null check (visibility in ('user', 'course', 'public')) default 'course',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enrollments_user on public.enrollments(user_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_documents_target_user on public.training_documents(target_user_id);
create index if not exists idx_documents_course on public.training_documents(course_id);
create index if not exists idx_tickets_author on public.tickets(author_id);
create index if not exists idx_tracking_user on public.tracking_events(user_id);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'trainer', false)
$$;

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_states enable row level security;
alter table public.tracking_events enable row level security;
alter table public.tickets enable row level security;
alter table public.training_documents enable row level security;

-- Nettoyage des anciennes politiques si tu relances ce script.
drop policy if exists "profiles_read_own_or_trainer" on public.profiles;
drop policy if exists "profiles_update_own_or_trainer" on public.profiles;
drop policy if exists "profiles_insert_trainer" on public.profiles;
drop policy if exists "profiles_insert_own_student" on public.profiles;
drop policy if exists "enrollments_read_own_or_trainer" on public.enrollments;
drop policy if exists "enrollments_manage_trainer" on public.enrollments;
drop policy if exists "user_states_read_own_or_trainer" on public.user_states;
drop policy if exists "user_states_write_own_or_trainer" on public.user_states;
drop policy if exists "tracking_insert_authenticated" on public.tracking_events;
drop policy if exists "tracking_read_trainer" on public.tracking_events;
drop policy if exists "tickets_read_own_or_trainer" on public.tickets;
drop policy if exists "tickets_insert_own" on public.tickets;
drop policy if exists "tickets_update_trainer" on public.tickets;
drop policy if exists "documents_read_allowed" on public.training_documents;
drop policy if exists "documents_manage_trainer" on public.training_documents;

create policy "profiles_read_own_or_trainer"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_trainer());

create policy "profiles_update_own_or_trainer"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_trainer())
with check (id = auth.uid() or public.is_trainer());

create policy "profiles_insert_own_student"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'student');

create policy "profiles_insert_trainer"
on public.profiles for insert
to authenticated
with check (public.is_trainer());

create policy "enrollments_read_own_or_trainer"
on public.enrollments for select
to authenticated
using (user_id = auth.uid() or public.is_trainer());

create policy "enrollments_manage_trainer"
on public.enrollments for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "user_states_read_own_or_trainer"
on public.user_states for select
to authenticated
using (user_id = auth.uid() or public.is_trainer());

create policy "user_states_write_own_or_trainer"
on public.user_states for all
to authenticated
using (user_id = auth.uid() or public.is_trainer())
with check (user_id = auth.uid() or public.is_trainer());

create policy "tracking_insert_authenticated"
on public.tracking_events for insert
to authenticated
with check (user_id = auth.uid());

create policy "tracking_read_trainer"
on public.tracking_events for select
to authenticated
using (public.is_trainer());

create policy "tickets_read_own_or_trainer"
on public.tickets for select
to authenticated
using (author_id = auth.uid() or public.is_trainer());

create policy "tickets_insert_own"
on public.tickets for insert
to authenticated
with check (author_id = auth.uid());

create policy "tickets_update_trainer"
on public.tickets for update
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "documents_read_allowed"
on public.training_documents for select
to authenticated
using (
  public.is_trainer()
  or target_user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'course'
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = training_documents.course_id
        and e.status = 'active'
    )
  )
);

create policy "documents_manage_trainer"
on public.training_documents for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents-prives', 'documents-prives', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('livrets-formation', 'livrets-formation', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Politiques Storage
-- documents-prives : dossiers /{uid}/convocation|attestation|...
-- livrets-formation : dossiers /{courseId}/livret|support|...
drop policy if exists "private_documents_read_own_or_trainer" on storage.objects;
drop policy if exists "private_documents_write_trainer" on storage.objects;
drop policy if exists "course_documents_read_enrolled_or_trainer" on storage.objects;
drop policy if exists "course_documents_write_trainer" on storage.objects;

create policy "private_documents_read_own_or_trainer"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents-prives'
  and (
    public.is_trainer()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "private_documents_write_trainer"
on storage.objects for all
to authenticated
using (bucket_id = 'documents-prives' and public.is_trainer())
with check (bucket_id = 'documents-prives' and public.is_trainer());

create policy "course_documents_read_enrolled_or_trainer"
on storage.objects for select
to authenticated
using (
  bucket_id = 'livrets-formation'
  and (
    public.is_trainer()
    or exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = (storage.foldername(name))[1]
        and e.status = 'active'
    )
  )
);

create policy "course_documents_write_trainer"
on storage.objects for all
to authenticated
using (bucket_id = 'livrets-formation' and public.is_trainer())
with check (bucket_id = 'livrets-formation' and public.is_trainer());
