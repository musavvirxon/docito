-- File: supabase/migrations/20260119124500_feedback_table_and_rls.sql
begin;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  type text not null check (type in ('bug','feature','other')),
  severity text not null check (severity in ('low','medium','high')),
  title text not null,
  message text not null,
  steps text null,
  expected text null,
  actual text null,
  page_url text null,
  role text null,
  roles jsonb null,
  user_email text null,
  user_name text null,
  app_version text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists feedback_user_id_created_at_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

-- Users can insert their own feedback
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='feedback_insert_own'
  ) then
    create policy feedback_insert_own
      on public.feedback
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can read their own feedback (optional, nice for later)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='feedback_select_own'
  ) then
    create policy feedback_select_own
      on public.feedback
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

commit;
