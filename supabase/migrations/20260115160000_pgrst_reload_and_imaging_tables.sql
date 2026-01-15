-- File: supabase/migrations/20260115160000_pgrst_reload_and_imaging_tables.sql

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper: reload PostgREST schema cache (callable from client/edge functions)
-- -----------------------------------------------------------------------------
create or replace function public.reload_pgrst_schema()
returns void
language plpgsql
security definer
as $$
begin
  perform pg_notify('pgrst', 'reload schema');
end;
$$;

revoke all on function public.reload_pgrst_schema() from public;
grant execute on function public.reload_pgrst_schema() to authenticated;

-- -----------------------------------------------------------------------------
-- Imaging Equipment (ensure exists)
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
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;

    if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_equipment_updated_at') then
      create trigger trg_imaging_equipment_updated_at
      before update on public.imaging_equipment
      for each row
      execute function public._update_imaging_equipment_updated_at();
    end if;
  end if;
end $$;

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
-- Imaging Center Settings (ensure exists)
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
-- Force PostgREST schema cache reload at end of migration
-- -----------------------------------------------------------------------------
select public.reload_pgrst_schema();

commit;
