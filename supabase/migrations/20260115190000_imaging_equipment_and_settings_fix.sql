-- File: supabase/migrations/20260115190000_imaging_equipment_and_settings_fix.sql

begin;

-- Ensure required extension
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- imaging_equipment (used by imaging-dashboard + imaging-analytics + UI)
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

-- updated_at trigger (works even if shared helper doesn't exist)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'update_updated_at_column' and pronamespace = 'public'::regnamespace) then
    create or replace function public.update_updated_at_column()
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
end $$;

-- Policies (idempotent)
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

-- -------------------------------------------------------------------
-- imaging_center_settings (used by embedded Settings section)
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

-- Force PostgREST schema reload to fix "schema cache" errors immediately after push
notify pgrst, 'reload schema';

commit;
