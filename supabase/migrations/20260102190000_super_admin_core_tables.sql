-- 20260102190000_super_admin_core_tables.sql
-- Core tables required by Super Admin dashboard:
-- - system_audit_logs
-- - practice_verification
-- - doctor_verification
-- - doctor_verification_documents
-- - help_articles
-- Plus RLS policies with a reusable is_super_admin() helper.

begin;

-- =========================
-- Helpers
-- =========================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
      and coalesce(ur.status, 'verified') = 'verified'
  );
$$;

-- =========================
-- system_audit_logs
-- =========================
create table if not exists public.system_audit_logs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_audit_logs_created_at on public.system_audit_logs(created_at desc);
create index if not exists idx_system_audit_logs_user_id on public.system_audit_logs(user_id);

alter table public.system_audit_logs enable row level security;

drop policy if exists "system_audit_logs_select_super_admin" on public.system_audit_logs;
create policy "system_audit_logs_select_super_admin"
on public.system_audit_logs
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "system_audit_logs_insert_super_admin" on public.system_audit_logs;
create policy "system_audit_logs_insert_super_admin"
on public.system_audit_logs
for insert
to authenticated
with check (public.is_super_admin());

-- =========================
-- practice_verification
-- =========================
create table if not exists public.practice_verification (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'pending',  -- pending | under_review | verified | rejected
  notes text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_practice_verification_practice_id
on public.practice_verification(practice_id);

alter table public.practice_verification enable row level security;

drop policy if exists "practice_verification_select_super_admin" on public.practice_verification;
create policy "practice_verification_select_super_admin"
on public.practice_verification
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "practice_verification_update_super_admin" on public.practice_verification;
create policy "practice_verification_update_super_admin"
on public.practice_verification
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- (Optional) allow practice admins to insert their own submissions later if you want:
-- create policy "practice_verification_insert_authenticated"
-- on public.practice_verification
-- for insert
-- to authenticated
-- with check (submitted_by = auth.uid());

-- =========================
-- doctor_verification
-- =========================
create table if not exists public.doctor_verification (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'pending', -- pending | under_review | verified | rejected
  notes text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_doctor_verification_doctor_id
on public.doctor_verification(doctor_id);

alter table public.doctor_verification enable row level security;

drop policy if exists "doctor_verification_select_super_admin" on public.doctor_verification;
create policy "doctor_verification_select_super_admin"
on public.doctor_verification
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "doctor_verification_update_super_admin" on public.doctor_verification;
create policy "doctor_verification_update_super_admin"
on public.doctor_verification
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- =========================
-- doctor_verification_documents
-- =========================
create table if not exists public.doctor_verification_documents (
  id uuid primary key default gen_random_uuid(),
  doctor_verification_id uuid not null references public.doctor_verification(id) on delete cascade,
  doc_type text not null, -- license | diploma | id | etc
  file_path text not null, -- storage path
  created_at timestamptz not null default now()
);

create index if not exists idx_doctor_verification_documents_verification_id
on public.doctor_verification_documents(doctor_verification_id);

alter table public.doctor_verification_documents enable row level security;

drop policy if exists "doctor_verification_documents_select_super_admin" on public.doctor_verification_documents;
create policy "doctor_verification_documents_select_super_admin"
on public.doctor_verification_documents
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "doctor_verification_documents_insert_super_admin" on public.doctor_verification_documents;
create policy "doctor_verification_documents_insert_super_admin"
on public.doctor_verification_documents
for insert
to authenticated
with check (public.is_super_admin());

-- =========================
-- help_articles (matches your component fields)
-- =========================
create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  description_en text,
  content_en text,

  -- optional other languages (safe to keep nullable)
  title_ru text,
  description_ru text,
  content_ru text,
  title_uz text,
  description_uz text,
  content_uz text,

  slug text not null unique,
  category text not null default 'General',
  icon text,
  color text,
  is_published boolean not null default false,
  is_popular boolean not null default false,
  display_order int not null default 0,
  views int not null default 0,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_help_articles_category on public.help_articles(category);
create index if not exists idx_help_articles_published on public.help_articles(is_published);

alter table public.help_articles enable row level security;

-- Public can read published articles
drop policy if exists "help_articles_select_published" on public.help_articles;
create policy "help_articles_select_published"
on public.help_articles
for select
to authenticated
using (is_published = true OR public.is_super_admin());

-- Only super admin can write
drop policy if exists "help_articles_write_super_admin" on public.help_articles;
create policy "help_articles_write_super_admin"
on public.help_articles
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

commit;
