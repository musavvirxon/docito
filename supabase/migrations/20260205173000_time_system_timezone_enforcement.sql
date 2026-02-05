-- Path: supabase/migrations/20260205173000_time_system_timezone_enforcement.sql

begin;

-- ============================================================
-- Step 3: Database Enforcement (Timezone Lock Rules)
-- - Facilities: timezone change allowed only until verified
-- - Post-verification timezone changes blocked at DB layer
-- - Doctors/patients (profiles): timezone can be changed anytime
-- - Idempotent: safe re-runs via IF EXISTS / catalog checks
-- ============================================================

-- ------------------------------------------------------------
-- 1) Generic trigger function to enforce timezone rules
--    Works across multiple tables by reading OLD/NEW as jsonb.
--    Requires columns added in Step 2:
--      - timezone_source
--      - timezone_locked
--      - timezone_updated_at
--    Optional column (if present):
--      - verification_status (text) with value 'verified'
--    Optional column (if present):
--      - timezone (IANA string)
-- ------------------------------------------------------------
create or replace function public.docito_enforce_timezone_rules()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);

  old_tz text := nullif(oldj->>'timezone', '');
  new_tz text := nullif(newj->>'timezone', '');

  tz_changed boolean := (new_tz is distinct from old_tz);

  has_ver_status boolean := (oldj ? 'verification_status') or (newj ? 'verification_status');
  old_ver text := coalesce(oldj->>'verification_status', '');
  new_ver text := coalesce(newj->>'verification_status', '');

  old_locked boolean := coalesce((oldj->>'timezone_locked')::boolean, false);
  new_locked boolean := coalesce((newj->>'timezone_locked')::boolean, false);

  is_verified boolean := false;
begin
  -- Treat row as verified if verification_status exists and is 'verified'
  if has_ver_status then
    is_verified := (old_ver = 'verified') or (new_ver = 'verified');
  end if;

  -- If the row is (now) verified, ensure timezone is locked (even if lock was not set)
  if has_ver_status and new_ver = 'verified' then
    new.timezone_locked := true;
    if new.timezone_source is null or new.timezone_source = '' then
      new.timezone_source := 'verification';
    end if;
  end if;

  -- Block timezone changes if locked or verified (facility rule)
  if tz_changed and (old_locked or new_locked or is_verified) then
    -- Allow service_role (Edge Functions / server-side automation)
    if auth.role() <> 'service_role' then
      raise exception 'Timezone is locked and cannot be changed after verification'
        using errcode = '42501';
    end if;
  end if;

  -- Audit metadata when timezone changes
  if tz_changed then
    new.timezone_updated_at := now();
    if new.timezone_source is null or new.timezone_source = '' then
      new.timezone_source := 'manual';
    end if;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2) Attach triggers (BEFORE UPDATE) to relevant tables
--    - Facilities: settings tables (pre/post verification enforcement)
--    - Profiles: audit metadata on timezone updates (no lock by default)
-- ------------------------------------------------------------
do $$
begin
  -- profiles
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_profiles_timezone_rules') then
      execute '
        create trigger trg_docito_profiles_timezone_rules
        before update on public.profiles
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;

  -- practice_settings
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='practice_settings') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_practice_settings_timezone_rules') then
      execute '
        create trigger trg_docito_practice_settings_timezone_rules
        before update on public.practice_settings
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;

  -- imaging_center_settings
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='imaging_center_settings') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_imaging_center_settings_timezone_rules') then
      execute '
        create trigger trg_docito_imaging_center_settings_timezone_rules
        before update on public.imaging_center_settings
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;

  -- lab_center_settings
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='lab_center_settings') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_lab_center_settings_timezone_rules') then
      execute '
        create trigger trg_docito_lab_center_settings_timezone_rules
        before update on public.lab_center_settings
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;

  -- pharmacy_settings
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pharmacy_settings') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_pharmacy_settings_timezone_rules') then
      execute '
        create trigger trg_docito_pharmacy_settings_timezone_rules
        before update on public.pharmacy_settings
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;

  -- entity_settings (if you use this as unified facility settings)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='entity_settings') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_entity_settings_timezone_rules') then
      execute '
        create trigger trg_docito_entity_settings_timezone_rules
        before update on public.entity_settings
        for each row
        execute function public.docito_enforce_timezone_rules()
      ';
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- 3) Lightweight constraints: timezone cannot be empty string
--    (Only added where a timezone column exists)
-- ------------------------------------------------------------
do $$
begin
  -- profiles
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'profiles_timezone_not_empty') then
      execute 'alter table public.profiles add constraint profiles_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;

  -- practice_settings
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='practice_settings' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'practice_settings_timezone_not_empty') then
      execute 'alter table public.practice_settings add constraint practice_settings_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;

  -- imaging_center_settings
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='imaging_center_settings' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'imaging_center_settings_timezone_not_empty') then
      execute 'alter table public.imaging_center_settings add constraint imaging_center_settings_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;

  -- lab_center_settings
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lab_center_settings' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'lab_center_settings_timezone_not_empty') then
      execute 'alter table public.lab_center_settings add constraint lab_center_settings_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;

  -- pharmacy_settings
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pharmacy_settings' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'pharmacy_settings_timezone_not_empty') then
      execute 'alter table public.pharmacy_settings add constraint pharmacy_settings_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;

  -- entity_settings
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='entity_settings' and column_name='timezone'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'entity_settings_timezone_not_empty') then
      execute 'alter table public.entity_settings add constraint entity_settings_timezone_not_empty check (timezone is null or timezone <> '''')';
    end if;
  end if;
end $$;

commit;
