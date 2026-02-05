-- File: supabase/migrations/20260205190000_docito_user_timezone_bootstrap.sql

begin;

-- ------------------------------------------------------------
-- 1) Profiles: add timezone tracking fields
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'timezone'
  ) then
    alter table public.profiles add column timezone text default 'America/New_York';
  end if;
end $$;

alter table public.profiles
  add column if not exists timezone_source text,
  add column if not exists timezone_updated_at timestamptz;

-- Backfill for existing rows
update public.profiles
set
  timezone_source = coalesce(timezone_source, 'legacy'),
  timezone_updated_at = coalesce(timezone_updated_at, updated_at, created_at, now())
where timezone is not null;

-- ------------------------------------------------------------
-- 2) Timezone validation helper
-- ------------------------------------------------------------

create or replace function public.docito_is_valid_timezone(p_tz text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from pg_timezone_names
    where name = p_tz
  );
$$;

grant execute on function public.docito_is_valid_timezone(text) to authenticated;

-- ------------------------------------------------------------
-- 3) Server-side setter for "my" timezone (tracks source)
-- ------------------------------------------------------------

create or replace function public.docito_set_my_timezone(
  p_timezone text,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  v_uid uuid;
  v_tz text;
  v_source text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_tz := nullif(btrim(p_timezone), '');
  if v_tz is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_timezone');
  end if;

  -- Validate timezone against pg_timezone_names
  if not public.docito_is_valid_timezone(v_tz) then
    return jsonb_build_object('ok', false, 'error', 'invalid_timezone');
  end if;

  v_source := coalesce(nullif(btrim(p_source), ''), 'manual');

  update public.profiles
  set
    timezone = v_tz,
    timezone_source = v_source,
    timezone_updated_at = now(),
    updated_at = now()
  where user_id = v_uid;

  return jsonb_build_object('ok', true, 'timezone', v_tz, 'source', v_source);
end;
$$;

grant execute on function public.docito_set_my_timezone(text, text) to authenticated;

-- ------------------------------------------------------------
-- 4) Signup trigger: prefer browser timezone from user metadata
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_role_text text;
  v_profile_role user_role;
  v_marketing_opt_in boolean := false;
  v_privacy_settings jsonb;
  v_timezone text;
  v_tz_source text;
begin
  -- Extract role from metadata, default to 'patient'
  v_role_text := coalesce(new.raw_user_meta_data->>'role', 'patient');

  -- Marketing opt-in from metadata (safe cast)
  if (new.raw_user_meta_data ? 'marketing_communications') then
    begin
      v_marketing_opt_in := (new.raw_user_meta_data->>'marketing_communications')::boolean;
    exception when others then
      v_marketing_opt_in := false;
    end;
  end if;

  v_privacy_settings := jsonb_build_object(
    'profileVisibility', true,
    'shareAnalytics', true,
    'marketingCommunications', v_marketing_opt_in
  );

  -- Map facility admin roles to 'admin' for profiles.role (backward compatibility)
  -- The actual role is stored in user_roles table
  v_profile_role := case
    when v_role_text in ('pharmacy_admin', 'lab_admin', 'imaging_admin', 'clinic_admin', 'super_admin', 'admin') then 'admin'::user_role
    when v_role_text = 'doctor' then 'doctor'::user_role
    when v_role_text = 'staff' then 'staff'::user_role
    else 'patient'::user_role
  end;

  -- Signup timezone from browser (client sends in raw_user_meta_data.timezone)
  v_timezone := nullif(btrim(new.raw_user_meta_data->>'timezone'), '');
  if v_timezone is not null and not public.docito_is_valid_timezone(v_timezone) then
    v_timezone := null;
  end if;

  if v_timezone is not null then
    v_tz_source := 'signup_browser';
  else
    v_timezone := coalesce(v_timezone, 'America/New_York');
    v_tz_source := 'signup_default';
  end if;

  insert into public.profiles (
    user_id,
    full_name,
    email,
    role,
    privacy_settings,
    timezone,
    timezone_source,
    timezone_updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_profile_role,
    v_privacy_settings,
    v_timezone,
    v_tz_source,
    now()
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    privacy_settings = coalesce(public.profiles.privacy_settings, excluded.privacy_settings),
    timezone = coalesce(public.profiles.timezone, excluded.timezone),
    timezone_source = coalesce(public.profiles.timezone_source, excluded.timezone_source),
    timezone_updated_at = coalesce(public.profiles.timezone_updated_at, excluded.timezone_updated_at),
    updated_at = now();

  -- Insert ONLY the signup role into user_roles table
  begin
    insert into public.user_roles (user_id, role)
    values (new.id, v_role_text::app_role)
    on conflict (user_id, role) do nothing;
  exception when invalid_text_representation then
    insert into public.user_roles (user_id, role)
    values (new.id, 'patient'::app_role)
    on conflict (user_id, role) do nothing;
  end;

  return new;
end;
$$;

-- Ensure trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
