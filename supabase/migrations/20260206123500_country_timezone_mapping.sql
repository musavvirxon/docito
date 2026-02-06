begin;

-- ============================================================
-- Country -> Timezone mapping (managed)
-- - Stores ONE "default" IANA timezone per country code
-- - Supports alias names -> ISO code normalization
-- - Provides RPCs to read + upsert mappings (super_admin write)
-- ============================================================

-- ------------------------------------------------------------
-- 0) Base table (if not already present)
-- ------------------------------------------------------------
create table if not exists public.country_default_timezones (
  country_code text primary key,
  timezone text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Ensure basic columns exist (idempotent)
alter table public.country_default_timezones
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

-- ------------------------------------------------------------
-- 1) Aliases: country name/variant -> ISO-3166 alpha2 code
-- ------------------------------------------------------------
create table if not exists public.country_code_aliases (
  alias text primary key,
  country_code text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_country_code_aliases_country_code
  on public.country_code_aliases(country_code);

-- Seed common aliases (expand anytime). Idempotent.
insert into public.country_code_aliases (alias, country_code)
values
  ('USA','US'),
  ('UNITED STATES','US'),
  ('UNITED STATES OF AMERICA','US'),
  ('U.S.','US'),
  ('UK','GB'),
  ('UNITED KINGDOM','GB'),
  ('GREAT BRITAIN','GB'),
  ('RUSSIA','RU'),
  ('RUSSIAN FEDERATION','RU'),
  ('KOREA, REPUBLIC OF','KR'),
  ('REPUBLIC OF KOREA','KR'),
  ('SOUTH KOREA','KR'),
  ('KOREA, DEMOCRATIC PEOPLE''S REPUBLIC OF','KP'),
  ('NORTH KOREA','KP'),
  ('UAE','AE'),
  ('UNITED ARAB EMIRATES','AE'),
  ('CZECHIA','CZ'),
  ('CZECH REPUBLIC','CZ'),
  ('VIET NAM','VN'),
  ('BOLIVIA','BO'),
  ('BOLIVIA, PLURINATIONAL STATE OF','BO'),
  ('VENEZUELA','VE'),
  ('VENEZUELA, BOLIVARIAN REPUBLIC OF','VE'),
  ('IRAN','IR'),
  ('IRAN, ISLAMIC REPUBLIC OF','IR'),
  ('SYRIA','SY'),
  ('SYRIAN ARAB REPUBLIC','SY'),
  ('TANZANIA','TZ'),
  ('TANZANIA, UNITED REPUBLIC OF','TZ'),
  ('MOLDOVA','MD'),
  ('MOLDOVA, REPUBLIC OF','MD'),
  ('LAOS','LA'),
  ('LAO PEOPLE''S DEMOCRATIC REPUBLIC','LA'),
  ('BRUNEI','BN'),
  ('BRUNEI DARUSSALAM','BN')
on conflict (alias) do update
set country_code = excluded.country_code,
    updated_at = now();

-- ------------------------------------------------------------
-- 2) Helper: validate IANA timezone against Postgres tz catalog
-- ------------------------------------------------------------
create or replace function public.docito_is_valid_timezone(p_tz text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from pg_timezone_names
    where name = p_tz
  );
$$;

grant execute on function public.docito_is_valid_timezone(text) to authenticated;

-- ------------------------------------------------------------
-- 3) Helper: normalize country to ISO alpha2
--    - Accepts: 'US', 'us', 'United States', 'USA'
-- ------------------------------------------------------------
create or replace function public.docito_normalize_country_code(p_country text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_raw text := coalesce(nullif(btrim(p_country),''), '');
  v_up text;
  v_code text;
begin
  if v_raw = '' then
    return null;
  end if;

  v_up := upper(v_raw);

  -- Strip common punctuation
  v_up := replace(v_up, '.', '');
  v_up := replace(v_up, ',', '');
  v_up := replace(v_up, '-', ' ');
  v_up := regexp_replace(v_up, '\s+', ' ', 'g');

  -- If looks like alpha2 already
  if length(v_up) = 2 and v_up ~ '^[A-Z]{2}$' then
    return v_up;
  end if;

  -- Try aliases
  select country_code into v_code
  from public.country_code_aliases
  where alias = v_up
  limit 1;

  if v_code is not null then
    return upper(v_code);
  end if;

  -- No match
  return null;
end;
$$;

grant execute on function public.docito_normalize_country_code(text) to authenticated;

-- ------------------------------------------------------------
-- 4) Country -> timezone RPC (read)
--    - Uses mapping table if found; else returns UTC
-- ------------------------------------------------------------
create or replace function public.docito_country_to_timezone(p_country text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text;
  v_tz text;
begin
  v_code := public.docito_normalize_country_code(p_country);

  if v_code is null then
    return 'UTC';
  end if;

  select timezone into v_tz
  from public.country_default_timezones
  where country_code = v_code
  limit 1;

  v_tz := coalesce(v_tz, 'UTC');

  if v_tz <> 'UTC' and not public.docito_is_valid_timezone(v_tz) then
    return 'UTC';
  end if;

  return v_tz;
end;
$$;

grant execute on function public.docito_country_to_timezone(text) to authenticated;

-- ------------------------------------------------------------
-- 5) Upsert mapping RPC (super_admin only)
-- ------------------------------------------------------------
create or replace function public.docito_upsert_country_default_timezone(
  p_country_code text,
  p_timezone text
)
returns public.country_default_timezones
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  v_code text := upper(coalesce(nullif(btrim(p_country_code),''), ''));
  v_tz text := coalesce(nullif(btrim(p_timezone),''), '');
  row public.country_default_timezones;
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Forbidden';
  end if;

  if v_code = '' or v_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country_code';
  end if;

  if v_tz = '' then
    raise exception 'Invalid timezone';
  end if;

  if not public.docito_is_valid_timezone(v_tz) then
    raise exception 'Invalid IANA timezone';
  end if;

  insert into public.country_default_timezones (country_code, timezone, updated_at)
  values (v_code, v_tz, now())
  on conflict (country_code) do update
    set timezone = excluded.timezone,
        updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.docito_upsert_country_default_timezone(text, text) to authenticated;

-- ------------------------------------------------------------
-- 6) Seed: minimal safe defaults (expand anytime)
-- ------------------------------------------------------------
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

select pg_notify('pgrst', 'reload schema');

commit;
