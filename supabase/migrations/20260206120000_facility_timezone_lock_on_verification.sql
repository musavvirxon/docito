-- File: supabase/migrations/20260206120000_facility_timezone_lock_on_verification.sql

begin;

-- ============================================================
-- Facility verification rule enforcement:
-- - When a facility becomes verified, its entity_settings.timezone is
--   set to the country default timezone and then LOCKED.
-- - After verification, non-super-admins cannot change timezone.
-- - Works for: practices, lab_centers, imaging_centers, pharmacies
-- ============================================================

-- ------------------------------------------------------------
-- 0) Country -> default timezone mapping table
-- ------------------------------------------------------------
create table if not exists public.country_default_timezones (
  country_code text primary key,
  timezone text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Seed a practical baseline map (expand anytime). Idempotent.
insert into public.country_default_timezones (country_code, timezone)
values
  ('US','America/New_York'),
  ('CA','America/Toronto'),
  ('MX','America/Mexico_City'),
  ('BR','America/Sao_Paulo'),
  ('AR','America/Argentina/Buenos_Aires'),
  ('GB','Europe/London'),
  ('IE','Europe/Dublin'),
  ('FR','Europe/Paris'),
  ('DE','Europe/Berlin'),
  ('ES','Europe/Madrid'),
  ('IT','Europe/Rome'),
  ('NL','Europe/Amsterdam'),
  ('SE','Europe/Stockholm'),
  ('NO','Europe/Oslo'),
  ('DK','Europe/Copenhagen'),
  ('PL','Europe/Warsaw'),
  ('TR','Europe/Istanbul'),
  ('UA','Europe/Kyiv'),
  ('RU','Europe/Moscow'),
  ('KZ','Asia/Almaty'),
  ('UZ','Asia/Tashkent'),
  ('AE','Asia/Dubai'),
  ('SA','Asia/Riyadh'),
  ('IN','Asia/Kolkata'),
  ('PK','Asia/Karachi'),
  ('BD','Asia/Dhaka'),
  ('TH','Asia/Bangkok'),
  ('VN','Asia/Ho_Chi_Minh'),
  ('CN','Asia/Shanghai'),
  ('JP','Asia/Tokyo'),
  ('KR','Asia/Seoul'),
  ('AU','Australia/Sydney'),
  ('NZ','Pacific/Auckland')
on conflict (country_code) do update
set timezone = excluded.timezone,
    updated_at = now();

-- ------------------------------------------------------------
-- 1) RPC: country -> timezone
-- Accepts 2-letter code OR common country names, returns IANA tz.
-- ------------------------------------------------------------
create or replace function public.docito_country_to_timezone(p_country text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_raw text := coalesce(nullif(btrim(p_country),''), '');
  v_code text;
  v_tz text;
begin
  if v_raw = '' then
    return 'UTC';
  end if;

  v_code := upper(v_raw);

  -- If name provided, normalize a few common variants:
  if length(v_code) > 2 then
    v_code := case
      when v_code in ('UNITED STATES','UNITED STATES OF AMERICA','USA') then 'US'
      when v_code in ('UNITED KINGDOM','UK','GREAT BRITAIN') then 'GB'
      when v_code in ('RUSSIA','RUSSIAN FEDERATION') then 'RU'
      when v_code in ('UZBEKISTAN') then 'UZ'
      when v_code in ('KAZAKHSTAN') then 'KZ'
      when v_code in ('UNITED ARAB EMIRATES','UAE') then 'AE'
      when v_code in ('SAUDI ARABIA') then 'SA'
      when v_code in ('SOUTH KOREA','KOREA, REPUBLIC OF','REPUBLIC OF KOREA') then 'KR'
      when v_code in ('JAPAN') then 'JP'
      when v_code in ('CHINA','PEOPLE''S REPUBLIC OF CHINA','PRC') then 'CN'
      when v_code in ('INDIA') then 'IN'
      when v_code in ('AUSTRALIA') then 'AU'
      when v_code in ('NEW ZEALAND') then 'NZ'
      when v_code in ('GERMANY') then 'DE'
      when v_code in ('FRANCE') then 'FR'
      when v_code in ('SPAIN') then 'ES'
      when v_code in ('ITALY') then 'IT'
      when v_code in ('NETHERLANDS') then 'NL'
      when v_code in ('SWEDEN') then 'SE'
      when v_code in ('NORWAY') then 'NO'
      when v_code in ('DENMARK') then 'DK'
      when v_code in ('POLAND') then 'PL'
      when v_code in ('TURKEY') then 'TR'
      when v_code in ('UKRAINE') then 'UA'
      when v_code in ('CANADA') then 'CA'
      when v_code in ('MEXICO') then 'MX'
      when v_code in ('BRAZIL') then 'BR'
      when v_code in ('ARGENTINA') then 'AR'
      else v_code
    end;
  end if;

  select timezone into v_tz
  from public.country_default_timezones
  where country_code = v_code
  limit 1;

  v_tz := coalesce(v_tz, 'UTC');

  -- Validate timezone if helper exists; otherwise return value.
  begin
    if exists (select 1 from pg_proc where proname = 'docito_is_valid_timezone' and pg_function_is_visible(oid)) then
      if not public.docito_is_valid_timezone(v_tz) then
        return 'UTC';
      end if;
    end if;
  exception when others then
    -- ignore validation errors and return v_tz
    null;
  end;

  return v_tz;
end;
$$;

grant execute on function public.docito_country_to_timezone(text) to authenticated;

-- ------------------------------------------------------------
-- 2) entity_settings: add lock fields
-- ------------------------------------------------------------
alter table public.entity_settings
  add column if not exists timezone_locked boolean not null default false,
  add column if not exists timezone_locked_at timestamptz,
  add column if not exists timezone_locked_by uuid references auth.users(id) on delete set null,
  add column if not exists timezone_lock_reason text;

create index if not exists idx_entity_settings_timezone_locked
  on public.entity_settings(entity_type, entity_id, timezone_locked);

-- ------------------------------------------------------------
-- 3) Enforce: once locked, non-super-admin cannot change timezone
-- ------------------------------------------------------------
create or replace function public.docito_enforce_entity_timezone_lock()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
begin
  -- Allow super admins to do anything.
  if public.has_role(auth.uid(), 'super_admin') then
    return new;
  end if;

  -- If lock is already enabled, prevent unlocking and changing timezone.
  if coalesce(old.timezone_locked, false) then
    if coalesce(new.timezone_locked, false) is distinct from true then
      raise exception 'Timezone is locked after verification';
    end if;

    if coalesce(new.timezone,'') is distinct from coalesce(old.timezone,'') then
      raise exception 'Timezone is locked after verification';
    end if;

    -- Prevent non-super-admin from changing lock metadata too.
    if coalesce(new.timezone_locked_at, old.timezone_locked_at) is distinct from old.timezone_locked_at then
      raise exception 'Timezone lock metadata cannot be changed';
    end if;

    if coalesce(new.timezone_locked_by, old.timezone_locked_by) is distinct from old.timezone_locked_by then
      raise exception 'Timezone lock metadata cannot be changed';
    end if;

    if coalesce(new.timezone_lock_reason, old.timezone_lock_reason) is distinct from old.timezone_lock_reason then
      raise exception 'Timezone lock metadata cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_entity_settings_timezone_lock') then
    create trigger trg_entity_settings_timezone_lock
      before update on public.entity_settings
      for each row
      execute function public.docito_enforce_entity_timezone_lock();
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) Upsert RPC: lock-aware timezone behavior
--    - If payload does not include timezone, keep existing timezone.
--    - If timezone is locked, block changes for non-super-admin.
-- ------------------------------------------------------------
create or replace function public.upsert_entity_settings(
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb
)
returns public.entity_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type,''));
  v_existing public.entity_settings;
  v_has_existing boolean := false;

  v_payload_tz text := nullif(p_payload->>'timezone','');
  v_timezone text;

  v_locked boolean := false;

  v_lock_req boolean := false;
  v_lock_reason text := nullif(p_payload->>'timezone_lock_reason','');

  row public.entity_settings;
begin
  if v_entity_type not in ('practice','clinic','lab','imaging','pharmacy') then
    raise exception 'Invalid entity_type';
  end if;

  -- Authorization: enforce access in function too (extra safety)
  if not (
    public.has_role(auth.uid(), 'super_admin')
    or (v_entity_type in ('practice','clinic') and public.can_access_entity('practice', p_entity_id))
    or (v_entity_type = 'lab' and public.can_access_entity('lab', p_entity_id))
    or (v_entity_type = 'imaging' and public.can_access_entity('imaging', p_entity_id))
    or (v_entity_type = 'pharmacy' and public.can_access_entity('pharmacy', p_entity_id))
  ) then
    raise exception 'Forbidden';
  end if;

  select * into v_existing
  from public.entity_settings
  where entity_type = v_entity_type and entity_id = p_entity_id
  limit 1;

  v_has_existing := found;
  v_locked := coalesce(v_existing.timezone_locked, false);

  -- Compute timezone:
  -- - If locked and not super_admin => only allow same timezone (or omit timezone).
  if v_locked and not public.has_role(auth.uid(), 'super_admin') then
    if v_payload_tz is not null and coalesce(v_existing.timezone,'') <> v_payload_tz then
      raise exception 'Timezone is locked after verification';
    end if;
    v_timezone := coalesce(v_existing.timezone, 'UTC');
  else
    -- If timezone omitted in payload, keep existing timezone; otherwise accept payload.
    v_timezone := coalesce(v_payload_tz, v_existing.timezone, 'UTC');
  end if;

  -- Validate timezone if helper exists
  begin
    if exists (select 1 from pg_proc where proname = 'docito_is_valid_timezone' and pg_function_is_visible(oid)) then
      if not public.docito_is_valid_timezone(v_timezone) then
        raise exception 'Invalid timezone';
      end if;
    end if;
  exception when others then
    -- ignore if helper missing
    null;
  end;

  -- Lock fields: only super admin may set these from payload.
  if public.has_role(auth.uid(), 'super_admin') then
    v_lock_req := coalesce((p_payload->>'timezone_locked')::boolean, false);
  else
    v_lock_req := coalesce(v_existing.timezone_locked, false);
    v_lock_reason := coalesce(v_existing.timezone_lock_reason, v_lock_reason);
  end if;

  insert into public.entity_settings(
    entity_type,
    entity_id,
    display_name,
    phone,
    email,
    website,
    address_line1,
    address_line2,
    city,
    region,
    postal_code,
    country,
    timezone,
    logo_url,
    hours,
    notification_prefs,
    billing_prefs,
    integrations,
    timezone_locked,
    timezone_locked_at,
    timezone_locked_by,
    timezone_lock_reason,
    updated_at
  )
  values (
    v_entity_type,
    p_entity_id,
    nullif(p_payload->>'display_name',''),
    nullif(p_payload->>'phone',''),
    nullif(p_payload->>'email',''),
    nullif(p_payload->>'website',''),
    nullif(p_payload->>'address_line1',''),
    nullif(p_payload->>'address_line2',''),
    nullif(p_payload->>'city',''),
    nullif(p_payload->>'region',''),
    nullif(p_payload->>'postal_code',''),
    nullif(p_payload->>'country',''),
    v_timezone,
    nullif(p_payload->>'logo_url',''),
    coalesce(p_payload->'hours', '{}'::jsonb),
    coalesce(p_payload->'notification_prefs', '{}'::jsonb),
    coalesce(p_payload->'billing_prefs', '{}'::jsonb),
    coalesce(p_payload->'integrations', '{}'::jsonb),
    v_lock_req,
    case when v_lock_req then coalesce(v_existing.timezone_locked_at, now()) else null end,
    case when v_lock_req then coalesce(v_existing.timezone_locked_by, auth.uid()) else null end,
    case when v_lock_req then coalesce(v_lock_reason, 'manual') else null end,
    now()
  )
  on conflict (entity_type, entity_id) do update set
    display_name = excluded.display_name,
    phone = excluded.phone,
    email = excluded.email,
    website = excluded.website,
    address_line1 = excluded.address_line1,
    address_line2 = excluded.address_line2,
    city = excluded.city,
    region = excluded.region,
    postal_code = excluded.postal_code,
    country = coalesce(excluded.country, public.entity_settings.country),
    timezone = excluded.timezone,
    logo_url = excluded.logo_url,
    hours = excluded.hours,
    notification_prefs = excluded.notification_prefs,
    billing_prefs = excluded.billing_prefs,
    integrations = excluded.integrations,
    timezone_locked = excluded.timezone_locked,
    timezone_locked_at = excluded.timezone_locked_at,
    timezone_locked_by = excluded.timezone_locked_by,
    timezone_lock_reason = excluded.timezone_lock_reason,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.upsert_entity_settings(text, uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 5) Verifying a facility => sync timezone by country + lock it
--    (used by admin edge function AND by DB triggers)
-- ------------------------------------------------------------
create or replace function public.docito_sync_entity_timezone_on_verification(
  p_entity_type text,
  p_entity_id uuid,
  p_country text,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type,''));
  v_country text := nullif(btrim(p_country),'');
  v_tz text;
begin
  if v_entity_type not in ('practice','clinic','lab','imaging','pharmacy') then
    raise exception 'Invalid entity_type';
  end if;

  v_tz := public.docito_country_to_timezone(v_country);

  -- Ensure entity_settings row exists and lock timezone
  insert into public.entity_settings(
    entity_type,
    entity_id,
    country,
    timezone,
    timezone_locked,
    timezone_locked_at,
    timezone_locked_by,
    timezone_lock_reason,
    updated_at
  )
  values (
    v_entity_type,
    p_entity_id,
    v_country,
    v_tz,
    true,
    now(),
    p_actor,
    'verification',
    now()
  )
  on conflict (entity_type, entity_id) do update set
    country = coalesce(excluded.country, public.entity_settings.country),
    timezone = excluded.timezone,
    timezone_locked = true,
    timezone_locked_at = coalesce(public.entity_settings.timezone_locked_at, excluded.timezone_locked_at),
    timezone_locked_by = coalesce(public.entity_settings.timezone_locked_by, excluded.timezone_locked_by),
    timezone_lock_reason = 'verification',
    updated_at = now();
end;
$$;

grant execute on function public.docito_sync_entity_timezone_on_verification(text, uuid, text, uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) DB-level safety net: when facility rows become verified,
--    call docito_sync_entity_timezone_on_verification(...)
--    Uses jsonb access so it won't break if a column differs (verified vs is_verified).
-- ------------------------------------------------------------
create or replace function public.docito_on_facility_verified_lock_timezone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  j_new jsonb := to_jsonb(new);
  j_old jsonb := to_jsonb(old);

  v_entity_type text := lower(coalesce(tg_argv[0],''));
  v_id uuid := (j_new->>'id')::uuid;
  v_country text := nullif(btrim(j_new->>'country'),'');

  v_new_verified boolean := false;
  v_old_verified boolean := false;

  v_new_vtext text;
  v_old_vtext text;

  v_new_status text;
  v_old_status text;
begin
  if v_entity_type not in ('practice','lab','imaging','pharmacy') then
    return new;
  end if;

  v_new_vtext := coalesce(j_new->>'is_verified', j_new->>'verified', '');
  v_old_vtext := coalesce(j_old->>'is_verified', j_old->>'verified', '');

  begin
    v_new_verified := coalesce(nullif(v_new_vtext,''), 'false')::boolean;
  exception when others then
    v_new_verified := false;
  end;

  begin
    v_old_verified := coalesce(nullif(v_old_vtext,''), 'false')::boolean;
  exception when others then
    v_old_verified := false;
  end;

  v_new_status := lower(coalesce(j_new->>'verification_status',''));
  v_old_status := lower(coalesce(j_old->>'verification_status',''));

  -- Determine if verification transitioned to verified.
  if (not v_old_verified and v_new_verified) or (v_old_status <> 'verified' and v_new_status = 'verified') then
    perform public.docito_sync_entity_timezone_on_verification(
      v_entity_type,
      v_id,
      v_country,
      null
    );
  end if;

  return new;
end;
$$;

-- Attach triggers (idempotent)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_practices_lock_tz_on_verify') then
    create trigger trg_practices_lock_tz_on_verify
      after update on public.practices
      for each row
      execute function public.docito_on_facility_verified_lock_timezone('practice');
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_lab_centers_lock_tz_on_verify') then
    create trigger trg_lab_centers_lock_tz_on_verify
      after update on public.lab_centers
      for each row
      execute function public.docito_on_facility_verified_lock_timezone('lab');
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_imaging_centers_lock_tz_on_verify') then
    create trigger trg_imaging_centers_lock_tz_on_verify
      after update on public.imaging_centers
      for each row
      execute function public.docito_on_facility_verified_lock_timezone('imaging');
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_pharmacies_lock_tz_on_verify') then
    create trigger trg_pharmacies_lock_tz_on_verify
      after update on public.pharmacies
      for each row
      execute function public.docito_on_facility_verified_lock_timezone('pharmacy');
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

commit;
