-- File: supabase/migrations/20260115221500_imaging_reports_billing_entity_and_schema_reload.sql
begin;

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- 1) billing_transactions: add entity scoping columns (compat for analytics/billing)
-- -------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'entity_type'
  ) then
    alter table public.billing_transactions
      add column entity_type text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'entity_id'
  ) then
    alter table public.billing_transactions
      add column entity_id uuid;
  end if;
end $$;

create index if not exists idx_billing_transactions_entity on public.billing_transactions(entity_type, entity_id);

-- Backfill entity scope for existing practice transactions
update public.billing_transactions
set entity_type = 'practice',
    entity_id = practice_id
where (entity_type is null or entity_type = '')
  and entity_id is null
  and practice_id is not null;

-- -------------------------------------------------------------------
-- 2) imaging_equipment (ensure exists)
-- -------------------------------------------------------------------
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

  status text not null default 'active'
    check (status in ('active','maintenance','offline','retired')),

  scan_types text[] not null default '{}'::text[],
  capacity_per_day integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_imaging_equipment_center on public.imaging_equipment(imaging_center_id);
create index if not exists idx_imaging_equipment_center_status on public.imaging_equipment(imaging_center_id, status);
create index if not exists idx_imaging_equipment_center_modality on public.imaging_equipment(imaging_center_id, modality);

alter table public.imaging_equipment enable row level security;

-- -------------------------------------------------------------------
-- 3) imaging_center_settings (ensure exists)
-- -------------------------------------------------------------------
create table if not exists public.imaging_center_settings (
  imaging_center_id uuid primary key references public.imaging_centers(id) on delete cascade,

  timezone text not null default 'UTC',
  billing_currency text not null default 'usd',

  notify_email boolean not null default true,
  notify_sms boolean not null default false,

  report_template text,

  updated_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists idx_imaging_center_settings_center on public.imaging_center_settings(imaging_center_id);

alter table public.imaging_center_settings enable row level security;

-- -------------------------------------------------------------------
-- 4) imaging_reports (connect Reports section to backend)
-- -------------------------------------------------------------------
create table if not exists public.imaging_reports (
  id uuid primary key default gen_random_uuid(),

  imaging_center_id uuid not null references public.imaging_centers(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,

  status text not null default 'draft'
    check (status in ('draft','finalized','delivered')),

  radiologist_user_id uuid,

  findings text not null default '',
  impression text not null default '',
  critical_findings boolean not null default false,

  finalized_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_imaging_reports_center_referral unique (imaging_center_id, referral_id)
);

create index if not exists idx_imaging_reports_center on public.imaging_reports(imaging_center_id);
create index if not exists idx_imaging_reports_referral on public.imaging_reports(referral_id);
create index if not exists idx_imaging_reports_status on public.imaging_reports(imaging_center_id, status);

alter table public.imaging_reports enable row level security;

-- -------------------------------------------------------------------
-- 5) updated_at trigger helper (idempotent)
-- -------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
      and pronamespace = 'public'::regnamespace
  ) then
    create function public.update_updated_at_column()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_equipment_updated_at') then
    create trigger trg_imaging_equipment_updated_at
    before update on public.imaging_equipment
    for each row
    execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_reports_updated_at') then
    create trigger trg_imaging_reports_updated_at
    before update on public.imaging_reports
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;

-- -------------------------------------------------------------------
-- 6) RLS policies (center admin/staff access)
-- -------------------------------------------------------------------
drop policy if exists "Imaging equipment: select by center access" on public.imaging_equipment;
create policy "Imaging equipment: select by center access"
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
);

drop policy if exists "Imaging equipment: manage by equipment managers" on public.imaging_equipment;
create policy "Imaging equipment: manage by equipment managers"
on public.imaging_equipment
for all
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
      and coalesce(s.can_manage_equipment, false) = true
  )
)
with check (
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
      and coalesce(s.can_manage_equipment, false) = true
  )
);

drop policy if exists "Imaging center settings: select by center access" on public.imaging_center_settings;
create policy "Imaging center settings: select by center access"
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

drop policy if exists "Imaging reports: select by center access" on public.imaging_reports;
create policy "Imaging reports: select by center access"
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
);

drop policy if exists "Imaging reports: write by center admin/staff" on public.imaging_reports;
create policy "Imaging reports: write by center admin/staff"
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
);

-- Allow imaging center admins/staff to SELECT billing_transactions scoped to their entity
drop policy if exists "Imaging centers can view their entity transactions" on public.billing_transactions;
create policy "Imaging centers can view their entity transactions"
on public.billing_transactions
for select
to authenticated
using (
  (billing_transactions.entity_type = 'imaging_center')
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
  )
);

-- Force PostgREST schema cache reload so Edge Functions & client stop seeing stale schema
notify pgrst, 'reload schema';

commit;
