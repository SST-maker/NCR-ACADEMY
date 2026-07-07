-- N.C.R Academy V5.3 étape Sessions
-- À lancer dans Supabase SQL Editor si les tables Sessions ne sont pas encore créées.

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

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  location text,
  trainer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_sessions_course_check check (
    course_id in (
      'communication-digitale',
      'outils-bureautiques',
      'litiges-clients',
      'community-manager',
      'acteur-sst'
    )
  ),
  constraint training_sessions_status_check check (
    status in ('draft', 'scheduled', 'completed', 'cancelled')
  )
);

create table if not exists public.session_students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attendance_status text not null default 'pending',
  completion_status text not null default 'pending',
  convocation_document_id uuid,
  certificate_document_id uuid,
  created_at timestamptz not null default now(),
  constraint session_students_unique unique (session_id, student_id),
  constraint session_students_attendance_check check (
    attendance_status in ('pending', 'present', 'absent', 'excused')
  ),
  constraint session_students_completion_check check (
    completion_status in ('pending', 'validated', 'not_validated')
  )
);

alter table public.training_documents
add column if not exists session_id uuid references public.training_sessions(id) on delete set null;

create index if not exists idx_training_sessions_course_id on public.training_sessions(course_id);
create index if not exists idx_training_sessions_trainer_id on public.training_sessions(trainer_id);
create index if not exists idx_session_students_session_id on public.session_students(session_id);
create index if not exists idx_session_students_student_id on public.session_students(student_id);
create index if not exists idx_training_documents_session_id on public.training_documents(session_id);

alter table public.training_sessions enable row level security;
alter table public.session_students enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.training_sessions to authenticated;
grant select, insert, update, delete on public.session_students to authenticated;
grant select, insert, update on public.enrollments to authenticated;
grant select, update on public.training_documents to authenticated;

drop policy if exists "training_sessions_read" on public.training_sessions;
create policy "training_sessions_read"
on public.training_sessions
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.session_students ss
    where ss.session_id = training_sessions.id
    and ss.student_id = auth.uid()
  )
);

drop policy if exists "training_sessions_insert_trainer" on public.training_sessions;
create policy "training_sessions_insert_trainer"
on public.training_sessions
for insert
to authenticated
with check (public.is_trainer());

drop policy if exists "training_sessions_update_trainer" on public.training_sessions;
create policy "training_sessions_update_trainer"
on public.training_sessions
for update
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

drop policy if exists "training_sessions_delete_trainer" on public.training_sessions;
create policy "training_sessions_delete_trainer"
on public.training_sessions
for delete
to authenticated
using (public.is_trainer());

drop policy if exists "session_students_read" on public.session_students;
create policy "session_students_read"
on public.session_students
for select
to authenticated
using (
  public.is_trainer()
  or student_id = auth.uid()
);

drop policy if exists "session_students_insert_trainer" on public.session_students;
create policy "session_students_insert_trainer"
on public.session_students
for insert
to authenticated
with check (public.is_trainer());

drop policy if exists "session_students_update_trainer" on public.session_students;
create policy "session_students_update_trainer"
on public.session_students
for update
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

drop policy if exists "session_students_delete_trainer" on public.session_students;
create policy "session_students_delete_trainer"
on public.session_students
for delete
to authenticated
using (public.is_trainer());
