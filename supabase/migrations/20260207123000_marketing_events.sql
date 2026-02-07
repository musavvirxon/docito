-- supabase/migrations/20260207123000_marketing_events.sql
-- Create a lightweight, write-only table for marketing and conversion events.
-- This migration is idempotent.

-- Ensure UUID generation is available
create extension if not exists pgcrypto;

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  page_path text not null,
  user_id uuid null,
  ip_address text null,
  user_agent text null,
  referrer text null,
  meta jsonb null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketing_events_user_id_fkey'
  ) then
    alter table public.marketing_events
      add constraint marketing_events_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end
$$;

alter table public.marketing_events enable row level security;

create index if not exists marketing_events_created_at_idx
  on public.marketing_events (created_at desc);

create index if not exists marketing_events_event_name_idx
  on public.marketing_events (event_name);

comment on table public.marketing_events is
  'Write-only marketing and conversion events recorded via edge functions.';
