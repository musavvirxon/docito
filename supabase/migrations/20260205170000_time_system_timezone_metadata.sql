-- Path: supabase/migrations/20260205170000_time_system_timezone_metadata.sql

begin;

-- ============================================================
-- Step 2: Database — Timezone Fields + Lock Support
-- - Adds timezone metadata fields across profiles + facility settings
-- - Idempotent: uses IF EXISTS / IF NOT EXISTS
-- ============================================================

-- -----------------------------
-- Profiles (patients/doctors/admin/staff)
-- -----------------------------
alter table if exists public.profiles
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- Ensure timezone exists (older installs already have it; keep default as-is if present)
alter table if exists public.profiles
  add column if not exists timezone varchar(100) default 'America/New_York';

-- Backfill safety
update public.profiles
set timezone = 'UTC'
where timezone is null;

-- -----------------------------
-- Practice settings (clinic/practice facility settings)
-- -----------------------------
alter table if exists public.practice_settings
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- -----------------------------
-- Imaging center settings
-- -----------------------------
alter table if exists public.imaging_center_settings
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- -----------------------------
-- Lab center settings
-- -----------------------------
alter table if exists public.lab_center_settings
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- -----------------------------
-- Pharmacy settings
-- -----------------------------
alter table if exists public.pharmacy_settings
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- -----------------------------
-- Unified entity settings (practice/clinic/lab/imaging/pharmacy)
-- -----------------------------
alter table if exists public.entity_settings
  add column if not exists timezone_source text not null default 'manual',
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_updated_at timestamptz not null default now();

-- -----------------------------
-- Minimal documentation (safe/no-op if repeated)
-- -----------------------------
comment on column public.profiles.timezone is 'IANA timezone string used for display (storage remains UTC)';
comment on column public.profiles.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
comment on column public.profiles.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
comment on column public.profiles.timezone_updated_at is 'Last time timezone value was updated';

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='practice_settings') then
    comment on column public.practice_settings.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
    comment on column public.practice_settings.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
    comment on column public.practice_settings.timezone_updated_at is 'Last time timezone value was updated';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='imaging_center_settings') then
    comment on column public.imaging_center_settings.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
    comment on column public.imaging_center_settings.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
    comment on column public.imaging_center_settings.timezone_updated_at is 'Last time timezone value was updated';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='lab_center_settings') then
    comment on column public.lab_center_settings.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
    comment on column public.lab_center_settings.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
    comment on column public.lab_center_settings.timezone_updated_at is 'Last time timezone value was updated';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pharmacy_settings') then
    comment on column public.pharmacy_settings.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
    comment on column public.pharmacy_settings.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
    comment on column public.pharmacy_settings.timezone_updated_at is 'Last time timezone value was updated';
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='entity_settings') then
    comment on column public.entity_settings.timezone_source is 'Origin of timezone: browser|ip|manual|verification|admin';
    comment on column public.entity_settings.timezone_locked is 'If true, timezone updates are blocked by enforcement (Step 3)';
    comment on column public.entity_settings.timezone_updated_at is 'Last time timezone value was updated';
  end if;
end $$;

commit;
