-- N.C.R Academy — Patch V5.3 étape 3
-- Objectif : permettre la génération automatique des convocations PDF
-- lors de la création d'une session de formation.

create extension if not exists pgcrypto;

create or replace function public.is_trainer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'trainer'
  );
$$;

grant execute on function public.is_trainer() to authenticated;

alter table public.training_documents
add column if not exists session_id uuid references public.training_sessions(id) on delete set null;

alter table public.session_students
add column if not exists convocation_document_id uuid references public.training_documents(id) on delete set null;

alter table public.session_students
add column if not exists certificate_document_id uuid references public.training_documents(id) on delete set null;

create index if not exists idx_training_documents_session_id
on public.training_documents(session_id);

create index if not exists idx_session_students_convocation_document_id
on public.session_students(convocation_document_id);

create index if not exists idx_session_students_certificate_document_id
on public.session_students(certificate_document_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.training_sessions to authenticated;
grant select, insert, update, delete on public.session_students to authenticated;
grant select, insert, update, delete on public.training_documents to authenticated;

alter table public.training_documents enable row level security;
alter table public.session_students enable row level security;
alter table public.training_sessions enable row level security;

-- Repose proprement la politique documents si besoin.
drop policy if exists "documents_manage_trainer" on public.training_documents;
create policy "documents_manage_trainer"
on public.training_documents
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

drop policy if exists "documents_read_allowed" on public.training_documents;
create policy "documents_read_allowed"
on public.training_documents
for select
to authenticated
using (
  public.is_trainer()
  or target_user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'course'
    and exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = training_documents.course_id
        and e.status = 'active'
    )
  )
);

-- Les buckets doivent rester privés.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents-prives', 'documents-prives', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('livrets-formation', 'livrets-formation', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage : lecture privée + écriture formateur.
drop policy if exists "private_documents_read_own_or_trainer" on storage.objects;
create policy "private_documents_read_own_or_trainer"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents-prives'
  and (
    public.is_trainer()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "private_documents_write_trainer" on storage.objects;
create policy "private_documents_write_trainer"
on storage.objects
for all
to authenticated
using (bucket_id = 'documents-prives' and public.is_trainer())
with check (bucket_id = 'documents-prives' and public.is_trainer());

drop policy if exists "course_documents_read_enrolled_or_trainer" on storage.objects;
create policy "course_documents_read_enrolled_or_trainer"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'livrets-formation'
  and (
    public.is_trainer()
    or exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = (storage.foldername(name))[1]
        and e.status = 'active'
    )
  )
);

drop policy if exists "course_documents_write_trainer" on storage.objects;
create policy "course_documents_write_trainer"
on storage.objects
for all
to authenticated
using (bucket_id = 'livrets-formation' and public.is_trainer())
with check (bucket_id = 'livrets-formation' and public.is_trainer());
