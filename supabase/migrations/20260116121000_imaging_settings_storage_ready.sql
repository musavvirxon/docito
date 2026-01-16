-- File: supabase/migrations/20260116121000_imaging_settings_storage_ready.sql
begin;

create extension if not exists pgcrypto;

-- Ensure table exists (idempotent)
create table if not exists public.imaging_center_settings (
  imaging_center_id uuid primary key references public.imaging_centers(id) on delete cascade,
  timezone text not null default 'UTC',
  billing_currency text not null default 'usd',
  notify_email boolean not null default true,
  notify_sms boolean not null default false,
  report_template text,
  auto_accept_referrals boolean not null default false,
  default_turnaround_hours integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist (idempotent)
alter table public.imaging_center_settings
  add column if not exists timezone text;

alter table public.imaging_center_settings
  add column if not exists billing_currency text;

alter table public.imaging_center_settings
  add column if not exists notify_email boolean;

alter table public.imaging_center_settings
  add column if not exists notify_sms boolean;

alter table public.imaging_center_settings
  add column if not exists report_template text;

alter table public.imaging_center_settings
  add column if not exists auto_accept_referrals boolean;

alter table public.imaging_center_settings
  add column if not exists default_turnaround_hours integer;

alter table public.imaging_center_settings
  add column if not exists created_at timestamptz;

alter table public.imaging_center_settings
  add column if not exists updated_at timestamptz;

-- Backfill defaults safely
update public.imaging_center_settings set timezone = 'UTC' where timezone is null;
update public.imaging_center_settings set billing_currency = 'usd' where billing_currency is null;
update public.imaging_center_settings set notify_email = true where notify_email is null;
update public.imaging_center_settings set notify_sms = false where notify_sms is null;
update public.imaging_center_settings set auto_accept_referrals = false where auto_accept_referrals is null;
update public.imaging_center_settings set default_turnaround_hours = 24 where default_turnaround_hours is null;
update public.imaging_center_settings set created_at = now() where created_at is null;
update public.imaging_center_settings set updated_at = now() where updated_at is null;

-- Index + RLS (idempotent)
create index if not exists idx_imaging_center_settings_center
  on public.imaging_center_settings(imaging_center_id);

alter table public.imaging_center_settings enable row level security;

drop policy if exists "Imaging center settings: select by center staff/admin" on public.imaging_center_settings;
create policy "Imaging center settings: select by center staff/admin"
on public.imaging_center_settings
for select
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_center_settings.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
);

drop policy if exists "Imaging center settings: upsert by center admin" on public.imaging_center_settings;
create policy "Imaging center settings: upsert by center admin"
on public.imaging_center_settings
for all
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
);

-- Force PostgREST schema cache reload
select pg_notify('pgrst', 'reload schema');

commit;
