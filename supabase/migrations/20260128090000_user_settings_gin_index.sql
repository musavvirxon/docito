-- Path: supabase/migrations/20260128090000_user_settings_gin_index.sql
begin;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_settings_settings_gin
  on public.user_settings
  using gin (settings);

commit;
