-- Path: supabase/migrations/20260205194500_time_system_verification_hook.sql
begin;

-- ============================================================
-- Step 8: Verification Hook — Set Facility Timezone + Lock
-- - When a facility becomes verified, set timezone based on
--   verification country/timezone and lock it.
-- - Also provides an RPC that Edge Functions can call during
--   verification to apply timezone + lock deterministically.
-- - Idempotent: IF EXISTS / IF NOT EXISTS + create or replace
-- ============================================================

-- 1) Persist verification inputs on entity_settings (optional but useful for audit)
alter table if exists public.entity_settings
  add column if not exists verified_country text,
  add column if not exists verified_timezone text;

comment on column public.entity_settings.verified_country is 'Country provided during verification (for timezone mapping)';
comment on column public.entity_settings.verified_timezone is 'Timezone provided during verification (IANA string, preferred over country mapping)';

-- 2) Helpers: validate timezone against pg_timezone_names + country->timezone mapping
create or replace function public.docito_is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pg_timezone_names
    where name = nullif(trim(p_timezone), '')
  );
$$;

create or replace function public.docito_country_to_timezone(p_country text)
returns text
language plpgsql
stable
as $$
declare
  c text := lower(trim(coalesce(p_country, '')));
begin
  if c = '' then
    return 'UTC';
  end if;

  -- Accept ISO2/ISO3 and common names (best-effort defaults for multi-TZ countries).
  if c in ('uz', 'uzb', 'uzbekistan') then return 'Asia/Tashkent'; end if;
  if c in ('kz', 'kaz', 'kazakhstan') then return 'Asia/Almaty'; end if;
  if c in ('kg', 'kgz', 'kyrgyzstan', 'kyrgyz republic') then return 'Asia/Bishkek'; end if;
  if c in ('tj', 'tjk', 'tajikistan') then return 'Asia/Dushanbe'; end if;
  if c in ('tm', 'tkm', 'turkmenistan') then return 'Asia/Ashgabat'; end if;
  if c in ('af', 'afg', 'afghanistan') then return 'Asia/Kabul'; end if;

  if c in ('ae', 'are', 'uae', 'united arab emirates') then return 'Asia/Dubai'; end if;
  if c in ('sa', 'sau', 'saudi arabia') then return 'Asia/Riyadh'; end if;
  if c in ('qa', 'qat', 'qatar') then return 'Asia/Qatar'; end if;
  if c in ('kw', 'kwt', 'kuwait') then return 'Asia/Kuwait'; end if;
  if c in ('om', 'omn', 'oman') then return 'Asia/Muscat'; end if;

  if c in ('tr', 'tur', 'turkey', 'türkiye') then return 'Europe/Istanbul'; end if;
  if c in ('ir', 'irn', 'iran') then return 'Asia/Tehran'; end if;
  if c in ('iq', 'irq', 'iraq') then return 'Asia/Baghdad'; end if;
  if c in ('il', 'isr', 'israel') then return 'Asia/Jerusalem'; end if;
  if c in ('jo', 'jor', 'jordan') then return 'Asia/Amman'; end if;
  if c in ('lb', 'lbn', 'lebanon') then return 'Asia/Beirut'; end if;
  if c in ('sy', 'syr', 'syria') then return 'Asia/Damascus'; end if;

  if c in ('in', 'ind', 'india') then return 'Asia/Kolkata'; end if;
  if c in ('pk', 'pak', 'pakistan') then return 'Asia/Karachi'; end if;
  if c in ('bd', 'bgd', 'bangladesh') then return 'Asia/Dhaka'; end if;
  if c in ('lk', 'lka', 'sri lanka') then return 'Asia/Colombo'; end if;

  if c in ('cn', 'chn', 'china') then return 'Asia/Shanghai'; end if;
  if c in ('jp', 'jpn', 'japan') then return 'Asia/Tokyo'; end if;
  if c in ('kr', 'kor', 'south korea', 'korea, republic of', 'republic of korea') then return 'Asia/Seoul'; end if;
  if c in ('sg', 'sgp', 'singapore') then return 'Asia/Singapore'; end if;
  if c in ('my', 'mys', 'malaysia') then return 'Asia/Kuala_Lumpur'; end if;
  if c in ('id', 'idn', 'indonesia') then return 'Asia/Jakarta'; end if;
  if c in ('th', 'tha', 'thailand') then return 'Asia/Bangkok'; end if;
  if c in ('vn', 'vnm', 'vietnam') then return 'Asia/Ho_Chi_Minh'; end if;
  if c in ('ph', 'phl', 'philippines') then return 'Asia/Manila'; end if;

  if c in ('gb', 'gbr', 'uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland') then return 'Europe/London'; end if;
  if c in ('fr', 'fra', 'france') then return 'Europe/Paris'; end if;
  if c in ('de', 'deu', 'germany') then return 'Europe/Berlin'; end if;
  if c in ('it', 'ita', 'italy') then return 'Europe/Rome'; end if;
  if c in ('es', 'esp', 'spain') then return 'Europe/Madrid'; end if;
  if c in ('pt', 'prt', 'portugal') then return 'Europe/Lisbon'; end if;
  if c in ('nl', 'nld', 'netherlands') then return 'Europe/Amsterdam'; end if;
  if c in ('se', 'swe', 'sweden') then return 'Europe/Stockholm'; end if;
  if c in ('no', 'nor', 'norway') then return 'Europe/Oslo'; end if;
  if c in ('dk', 'dnk', 'denmark') then return 'Europe/Copenhagen'; end if;
  if c in ('pl', 'pol', 'poland') then return 'Europe/Warsaw'; end if;
  if c in ('ua', 'ukr', 'ukraine') then return 'Europe/Kyiv'; end if;
  if c in ('ru', 'rus', 'russia', 'russian federation') then return 'Europe/Moscow'; end if;

  if c in ('us', 'usa', 'united states', 'united states of america') then return 'America/New_York'; end if;
  if c in ('ca', 'can', 'canada') then return 'America/Toronto'; end if;
  if c in ('mx', 'mex', 'mexico') then return 'America/Mexico_City'; end if;
  if c in ('br', 'bra', 'brazil') then return 'America/Sao_Paulo'; end if;
  if c in ('ar', 'arg', 'argentina') then return 'America/Argentina/Buenos_Aires'; end if;

  if c in ('au', 'aus', 'australia') then return 'Australia/Sydney'; end if;
  if c in ('nz', 'nzl', 'new zealand') then return 'Pacific/Auckland'; end if;

  if c in ('eg', 'egy', 'egypt') then return 'Africa/Cairo'; end if;
  if c in ('za', 'zaf', 'south africa') then return 'Africa/Johannesburg'; end if;
  if c in ('ng', 'nga', 'nigeria') then return 'Africa/Lagos'; end if;
  if c in ('ke', 'ken', 'kenya') then return 'Africa/Nairobi'; end if;
  if c in ('et', 'eth', 'ethiopia') then return 'Africa/Addis_Ababa'; end if;
  if c in ('ma', 'mar', 'morocco') then return 'Africa/Casablanca'; end if;
  if c in ('dz', 'dza', 'algeria') then return 'Africa/Algiers'; end if;
  if c in ('tn', 'tun', 'tunisia') then return 'Africa/Tunis'; end if;

  return 'UTC';
end;
$$;

-- 3) RPC: apply timezone+lock for a verified facility (upsert-safe)
create or replace function public.docito_apply_entity_verification_timezone(
  p_entity_type text,
  p_entity_id uuid,
  p_verified_country text default null,
  p_verified_timezone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := lower(trim(coalesce(p_entity_type, '')));
  v_country text := nullif(trim(coalesce(p_verified_country, '')), '');
  v_verified_tz text := nullif(trim(coalesce(p_verified_timezone, '')), '');

  v_existing_country text := null;
  v_tz text := null;
begin
  if v_entity_type not in ('practice','clinic','lab','imaging','pharmacy') then
    raise exception 'Invalid entity_type';
  end if;

  -- Allow triggers/background (no JWT claims) + service_role, otherwise require super_admin.
  if coalesce(auth.role(), '') not in ('', 'service_role') then
    if not public.has_role(auth.uid(), 'super_admin') then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  end if;

  -- Prefer verified country from params; fallback to existing entity_settings.country if present
  select es.country
    into v_existing_country
  from public.entity_settings es
  where es.entity_type = v_entity_type
    and es.entity_id = p_entity_id
  limit 1;

  v_country := coalesce(v_country, nullif(trim(coalesce(v_existing_country, '')), ''));

  -- Prefer verified timezone if valid, else map from country
  if v_verified_tz is not null and public.docito_is_valid_timezone(v_verified_tz) then
    v_tz := v_verified_tz;
  else
    v_tz := public.docito_country_to_timezone(v_country);
  end if;

  if v_tz is null or v_tz = '' then
    v_tz := 'UTC';
  end if;

  insert into public.entity_settings (
    entity_type,
    entity_id,
    timezone,
    timezone_source,
    timezone_locked,
    timezone_updated_at,
    verified_country,
    verified_timezone,
    updated_at
  )
  values (
    v_entity_type,
    p_entity_id,
    v_tz,
    'verification',
    true,
    now(),
    v_country,
    v_verified_tz,
    now()
  )
  on conflict (entity_type, entity_id) do update set
    timezone = excluded.timezone,
    timezone_source = 'verification',
    timezone_locked = true,
    timezone_updated_at = now(),
    verified_country = excluded.verified_country,
    verified_timezone = excluded.verified_timezone,
    updated_at = now();

  return;
end;
$$;

grant execute on function public.docito_apply_entity_verification_timezone(text, uuid, text, text) to authenticated;

-- 4) Trigger: on facility verification transition -> apply timezone+lock
create or replace function public.docito_on_facility_verified_apply_timezone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  newj jsonb := to_jsonb(new);
  oldj jsonb := to_jsonb(old);

  entity_type text := lower(coalesce(tg_argv[0], ''));
  entity_id uuid;

  new_verified boolean := false;
  old_verified boolean := false;

  new_status text := lower(coalesce(newj->>'verification_status', ''));
  old_status text := lower(coalesce(oldj->>'verification_status', ''));

  new_country text := nullif(trim(coalesce(newj->>'verified_country', newj->>'country', '')), '');
  new_tz text := nullif(trim(coalesce(newj->>'verified_timezone', '')), '');
begin
  if entity_type = '' then
    return new;
  end if;

  -- Guard: must have id column
  begin
    entity_id := (newj->>'id')::uuid;
  exception when others then
    return new;
  end;

  new_verified :=
    coalesce((newj->>'verified')::boolean, false)
    or coalesce((newj->>'is_verified')::boolean, false)
    or new_status = 'verified';

  old_verified :=
    coalesce((oldj->>'verified')::boolean, false)
    or coalesce((oldj->>'is_verified')::boolean, false)
    or old_status = 'verified';

  if new_verified and not old_verified then
    perform public.docito_apply_entity_verification_timezone(entity_type, entity_id, new_country, new_tz);
  end if;

  return new;
end;
$$;

do $$
begin
  -- practices -> entity_type 'practice'
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='practices')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='practices' and column_name='id') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_practices_verified_timezone_lock') then
      execute '
        create trigger trg_docito_practices_verified_timezone_lock
        after update on public.practices
        for each row
        execute function public.docito_on_facility_verified_apply_timezone(''practice'')
      ';
    end if;
  end if;

  -- clinics (if present) -> entity_type 'clinic'
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='clinics')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='clinics' and column_name='id') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_clinics_verified_timezone_lock') then
      execute '
        create trigger trg_docito_clinics_verified_timezone_lock
        after update on public.clinics
        for each row
        execute function public.docito_on_facility_verified_apply_timezone(''clinic'')
      ';
    end if;
  end if;

  -- pharmacies -> entity_type 'pharmacy'
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pharmacies')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='pharmacies' and column_name='id') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_pharmacies_verified_timezone_lock') then
      execute '
        create trigger trg_docito_pharmacies_verified_timezone_lock
        after update on public.pharmacies
        for each row
        execute function public.docito_on_facility_verified_apply_timezone(''pharmacy'')
      ';
    end if;
  end if;

  -- lab_centers -> entity_type 'lab'
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='lab_centers')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='lab_centers' and column_name='id') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_lab_centers_verified_timezone_lock') then
      execute '
        create trigger trg_docito_lab_centers_verified_timezone_lock
        after update on public.lab_centers
        for each row
        execute function public.docito_on_facility_verified_apply_timezone(''lab'')
      ';
    end if;
  end if;

  -- imaging_centers -> entity_type 'imaging'
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='imaging_centers')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='imaging_centers' and column_name='id') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_docito_imaging_centers_verified_timezone_lock') then
      execute '
        create trigger trg_docito_imaging_centers_verified_timezone_lock
        after update on public.imaging_centers
        for each row
        execute function public.docito_on_facility_verified_apply_timezone(''imaging'')
      ';
    end if;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

commit;
