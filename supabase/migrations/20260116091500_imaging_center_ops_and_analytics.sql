-- File: supabase/migrations/20260116091500_imaging_center_ops_and_analytics.sql

begin;

-- 1) Imaging equipment table (required by dashboard + equipment manager)
create table if not exists public.imaging_equipment (
  id uuid primary key default gen_random_uuid(),
  imaging_center_id uuid not null references public.imaging_centers(id) on delete cascade,
  name text not null,
  modality text not null,
  manufacturer text,
  model text,
  serial_number text,
  installation_date date,
  last_maintenance date,
  next_maintenance date,
  status text not null default 'active' check (status in ('active','maintenance','offline','retired')),
  scan_types text[] not null default '{}',
  capacity_per_day integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.imaging_equipment enable row level security;

create index if not exists idx_imaging_equipment_center on public.imaging_equipment(imaging_center_id);
create index if not exists idx_imaging_equipment_center_modality on public.imaging_equipment(imaging_center_id, modality);

drop policy if exists "Imaging equipment: select by center staff/admin" on public.imaging_equipment;
create policy "Imaging equipment: select by center staff/admin"
on public.imaging_equipment
for select
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Imaging equipment: manage by center admin" on public.imaging_equipment;
create policy "Imaging equipment: manage by center admin"
on public.imaging_equipment
for all
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- 2) Imaging center settings table
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
  or public.has_role(auth.uid(), 'super_admin')
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
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- 3) Billing transactions: entity scope columns (fixes missing billing_transactions.entity_type error)
alter table public.billing_transactions
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists idx_billing_transactions_entity on public.billing_transactions(entity_type, entity_id);

drop policy if exists "Imaging centers can view their entity transactions" on public.billing_transactions;
create policy "Imaging centers can view their entity transactions"
on public.billing_transactions
for select
to authenticated
using (
  entity_type = 'imaging_center'
  and (
    exists (
      select 1 from public.imaging_centers ic
      where ic.id = billing_transactions.entity_id
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.imaging_staff s
      where s.imaging_center_id = billing_transactions.entity_id
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
    or public.has_role(auth.uid(), 'super_admin')
  )
);

-- 4) Orders control columns on referrals
alter table public.referrals
  add column if not exists imaging_workflow_status text,
  add column if not exists assigned_imaging_staff_id uuid references public.imaging_staff(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
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

-- default workflow status for imaging referrals (only set when null, future inserts handled by app)
update public.referrals
set imaging_workflow_status = 'scheduled'
where imaging_workflow_status is null
  and receiver_type = 'imaging_center';

create index if not exists idx_referrals_imaging_center_workflow on public.referrals(receiver_entity_id, imaging_workflow_status)
where receiver_type = 'imaging_center';

-- Ensure imaging center admins/staff can update imaging referrals (orders control)
drop policy if exists "Imaging center receivers can update referrals" on public.referrals;
create policy "Imaging center receivers can update referrals"
on public.referrals
for update
to authenticated
using (
  receiver_type = 'imaging_center'
  and (
    exists (select 1 from public.imaging_centers ic where ic.id = referrals.receiver_entity_id and ic.admin_id = auth.uid())
    or exists (select 1 from public.imaging_staff s where s.imaging_center_id = referrals.receiver_entity_id and s.user_id = auth.uid() and s.status = 'active')
    or public.has_role(auth.uid(), 'super_admin')
  )
)
with check (
  receiver_type = 'imaging_center'
  and (
    exists (select 1 from public.imaging_centers ic where ic.id = referrals.receiver_entity_id and ic.admin_id = auth.uid())
    or exists (select 1 from public.imaging_staff s where s.imaging_center_id = referrals.receiver_entity_id and s.user_id = auth.uid() and s.status = 'active')
    or public.has_role(auth.uid(), 'super_admin')
  )
);

-- 5) Imaging reports table (used by analytics; can be adopted by report manager later)
create table if not exists public.imaging_reports (
  id uuid primary key default gen_random_uuid(),
  imaging_center_id uuid not null references public.imaging_centers(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  modality text,
  status text not null default 'draft' check (status in ('draft','finalized','amended')),
  findings text,
  impression text,
  recommendations text,
  created_by uuid,
  finalized_by uuid,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referral_id)
);

alter table public.imaging_reports enable row level security;

create index if not exists idx_imaging_reports_center_created on public.imaging_reports(imaging_center_id, created_at);

drop policy if exists "Imaging reports: select by center staff/admin" on public.imaging_reports;
create policy "Imaging reports: select by center staff/admin"
on public.imaging_reports
for select
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Imaging reports: manage by center staff/admin" on public.imaging_reports;
create policy "Imaging reports: manage by center staff/admin"
on public.imaging_reports
for all
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1 from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- 6) Imaging staff: allow center admin manage (was super-admin-only)
drop policy if exists "Center admins can manage imaging staff" on public.imaging_staff;
create policy "Center admins can manage imaging staff"
on public.imaging_staff
for all
to authenticated
using (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_staff.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.imaging_centers ic
    where ic.id = imaging_staff.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- 7) Reload PostgREST schema cache after adding tables/columns
select pg_notify('pgrst', 'reload schema');

commit;
