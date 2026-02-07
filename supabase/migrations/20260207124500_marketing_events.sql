-- File: supabase/migrations/20260207124500_marketing_events.sql

-- Marketing events: lightweight analytics for key marketing/CTA interactions.
-- - Captures anonymous + authenticated events (user_id nullable)
-- - RLS enabled; only super_admin can read/delete from the client
-- - Inserts are intended to be performed via Edge Function using service role

create extension if not exists pgcrypto;

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  event_name text not null,
  page_path text null,
  referrer text null,
  user_agent text null,
  ip inet null,
  meta jsonb not null default '{}'::jsonb
);

-- Useful indexes for filtering in the superadmin dashboard
create index if not exists marketing_events_created_at_idx on public.marketing_events (created_at desc);
create index if not exists marketing_events_event_name_idx on public.marketing_events (event_name);
create index if not exists marketing_events_user_id_idx on public.marketing_events (user_id);

alter table public.marketing_events enable row level security;

-- Only super_admin can read/delete from the client (dashboard).
-- Inserts are done by the Edge Function via service role.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_events'
      and policyname = 'marketing_events_select_super_admin'
  ) then
    create policy marketing_events_select_super_admin
      on public.marketing_events
      for select
      to authenticated
      using (public.is_super_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_events'
      and policyname = 'marketing_events_delete_super_admin'
  ) then
    create policy marketing_events_delete_super_admin
      on public.marketing_events
      for delete
      to authenticated
      using (public.is_super_admin());
  end if;
end $$;

-- Permissions (RLS still applies for authenticated)
grant select, delete on public.marketing_events to authenticated;
grant select, insert, delete on public.marketing_events to service_role;
