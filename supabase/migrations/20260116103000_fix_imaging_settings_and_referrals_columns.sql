-- File: supabase/migrations/20260116103000_fix_imaging_settings_and_referrals_columns.sql
begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- imaging_center_settings (missing table in schema cache)
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
-- referrals: imaging_workflow_status column missing
-- ---------------------------------------------------------
alter table public.referrals
  add column if not exists imaging_workflow_status text;

alter table public.referrals
  add column if not exists assigned_imaging_staff_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referrals_imaging_workflow_status_check'
  ) then
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
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referrals_assigned_imaging_staff_id_fkey'
  ) then
    alter table public.referrals
      add constraint referrals_assigned_imaging_staff_id_fkey
      foreign key (assigned_imaging_staff_id)
      references public.imaging_staff(id)
      on delete set null;
  end if;
end $$;

update public.referrals
set imaging_workflow_status = 'scheduled'
where imaging_workflow_status is null
  and receiver_type = 'imaging_center';

create index if not exists idx_referrals_imaging_center_workflow
  on public.referrals(receiver_entity_id, imaging_workflow_status)
  where receiver_type = 'imaging_center';

create index if not exists idx_referrals_imaging_center_assigned_staff
  on public.referrals(receiver_entity_id, assigned_imaging_staff_id)
  where receiver_type = 'imaging_center';

-- ---------------------------------------------------------
-- Force PostgREST schema reload (fixes "schema cache")
-- ---------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
