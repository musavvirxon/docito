-- File: supabase/migrations/20260115150000_imaging_equipment_settings_schema_reload.sql

begin;

-- Ensure UUID generator exists
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Imaging Equipment
-- -----------------------------------------------------------------------------
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

-- updated_at trigger (idempotent)
do $$
begin
  if to_regprocedure('public.update_updated_at_column()') is not null then
    if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_equipment_updated_at') then
      create trigger trg_imaging_equipment_updated_at
      before update on public.imaging_equipment
      for each row
      execute function public.update_updated_at_column();
    end if;
  else
    create or replace function public._update_imaging_equipment_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;

    if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_equipment_updated_at') then
      create trigger trg_imaging_equipment_updated_at
      before update on public.imaging_equipment
      for each row
      execute function public._update_imaging_equipment_updated_at();
    end if;
  end if;
end $$;

-- Policies (drop/recreate to avoid drift)
drop policy if exists "Imaging equipment: select by center access" on public.imaging_equipment;
create policy "Imaging equipment: select by center access"
on public.imaging_equipment
for select
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Imaging equipment: manage by equipment managers" on public.imaging_equipment;
create policy "Imaging equipment: manage by equipment managers"
on public.imaging_equipment
for all
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and coalesce(s.can_manage_equipment, false) = true
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and coalesce(s.can_manage_equipment, false) = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- -----------------------------------------------------------------------------
-- Imaging Center Settings
-- -----------------------------------------------------------------------------
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

drop policy if exists "Imaging center settings: select by center admin/staff" on public.imaging_center_settings;
create policy "Imaging center settings: select by center admin/staff"
on public.imaging_center_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_center_settings.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  )
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Imaging center settings: insert by center admin" on public.imaging_center_settings;
create policy "Imaging center settings: insert by center admin"
on public.imaging_center_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Imaging center settings: update by center admin" on public.imaging_center_settings;
create policy "Imaging center settings: update by center admin"
on public.imaging_center_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_center_settings.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- -----------------------------------------------------------------------------
-- Billing: entity scoping for imaging centers (safe if already added)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Force PostgREST schema cache reload so the new tables appear immediately
-- -----------------------------------------------------------------------------
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  -- no-op
end $$;

commit;
