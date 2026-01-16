-- File: supabase/migrations/20260116114500_imaging_schema_hardening.sql
begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) imaging_center_settings (idempotent + RLS)
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- 2) imaging_order_state (robust orders control without relying on referrals columns)
-- ---------------------------------------------------------
create table if not exists public.imaging_order_state (
  referral_id uuid primary key references public.referrals(id) on delete cascade,
  imaging_center_id uuid not null references public.imaging_centers(id) on delete cascade,

  workflow_status text not null default 'scheduled'
    check (workflow_status in ('scheduled','checked_in','in_progress','awaiting_report','completed','cancelled')),

  priority text not null default 'routine'
    check (priority in ('routine','urgent','stat')),

  assigned_staff_id uuid references public.imaging_staff(id) on delete set null,

  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_imaging_order_state_center on public.imaging_order_state(imaging_center_id);
create index if not exists idx_imaging_order_state_center_workflow on public.imaging_order_state(imaging_center_id, workflow_status);
create index if not exists idx_imaging_order_state_center_staff on public.imaging_order_state(imaging_center_id, assigned_staff_id);

alter table public.imaging_order_state enable row level security;

drop policy if exists "Imaging order state: select by center staff/admin" on public.imaging_order_state;
create policy "Imaging order state: select by center staff/admin"
on public.imaging_order_state
for select
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
);

drop policy if exists "Imaging order state: manage by center staff/admin" on public.imaging_order_state;
create policy "Imaging order state: manage by center staff/admin"
on public.imaging_order_state
for all
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
);

-- ---------------------------------------------------------
-- 3) Best-effort: still add referrals columns if missing (future use)
-- ---------------------------------------------------------
alter table public.referrals
  add column if not exists imaging_workflow_status text;

alter table public.referrals
  add column if not exists assigned_imaging_staff_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_imaging_workflow_status_check') then
    alter table public.referrals
      add constraint referrals_imaging_workflow_status_check
      check (
        imaging_workflow_status is null
        or imaging_workflow_status in ('scheduled','checked_in','in_progress','awaiting_report','completed','cancelled')
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_assigned_imaging_staff_id_fkey') then
    alter table public.referrals
      add constraint referrals_assigned_imaging_staff_id_fkey
      foreign key (assigned_imaging_staff_id)
      references public.imaging_staff(id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------
-- 4) Force PostgREST schema reload (fixes schema cache errors)
-- ---------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
