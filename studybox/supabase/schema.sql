-- =====================================================================
-- StudyBox - Skema Database Supabase
-- Jalankan seluruh isi file ini di Supabase -> SQL Editor -> Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABEL
-- ---------------------------------------------------------------------

create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#7c5cfc',
  created_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  title       text not null default 'Tanpa judul',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  name        text not null,
  path        text not null,
  size        bigint not null default 0,
  mime        text not null default 'application/pdf',
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  description  text not null default '',
  deadline     date,
  status       text not null default 'pending' check (status in ('pending', 'completed')),
  created_at   timestamptz not null default now()
);

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists notes_user_idx      on public.notes (user_id, updated_at desc);
create index if not exists files_user_idx      on public.files (user_id, created_at desc);
create index if not exists tasks_user_idx      on public.tasks (user_id, status, deadline);
create index if not exists subjects_user_idx   on public.subjects (user_id, name);
create index if not exists activities_user_idx on public.activities (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY: setiap pengguna hanya bisa mengakses datanya sendiri
-- ---------------------------------------------------------------------

alter table public.subjects   enable row level security;
alter table public.notes      enable row level security;
alter table public.files      enable row level security;
alter table public.tasks      enable row level security;
alter table public.activities enable row level security;

drop policy if exists "subjects: own rows" on public.subjects;
create policy "subjects: own rows" on public.subjects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notes: own rows" on public.notes;
create policy "notes: own rows" on public.notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (subject_id is null or exists (
      select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()
    ))
  );

drop policy if exists "files: own rows" on public.files;
create policy "files: own rows" on public.files
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (subject_id is null or exists (
      select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()
    ))
  );

drop policy if exists "tasks: own rows" on public.tasks;
create policy "tasks: own rows" on public.tasks
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (subject_id is null or exists (
      select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()
    ))
  );

drop policy if exists "activities: own rows" on public.activities;
create policy "activities: own rows" on public.activities
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table
  public.subjects,
  public.notes,
  public.files,
  public.tasks,
  public.activities
to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE: bucket privat "pdfs" (maks 25 MB, hanya PDF)
-- File disimpan di folder <user_id>/..., hanya pemiliknya yang bisa akses
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 26214400,
      allowed_mime_types = array['application/pdf'];

drop policy if exists "pdfs: select own" on storage.objects;
create policy "pdfs: select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdfs: insert own" on storage.objects;
create policy "pdfs: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdfs: update own" on storage.objects;
create policy "pdfs: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdfs: delete own" on storage.objects;
create policy "pdfs: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
