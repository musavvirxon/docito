-- File: supabase/migrations/20260205120000_entity_settings_timezone_lock.sql
begin;

-- Enforce: facilities can change timezone until verification; after verification, timezone is locked (unless super_admin).
create or replace function public.upsert_entity_settings(
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb
)
returns public.entity_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type,''));
  v_is_super boolean := public.has_role(auth.uid(), 'super_admin');
  v_is_verified boolean := false;

  v_existing_timezone text;
  v_timezone text := null;

  row public.entity_settings;
begin
  if v_entity_type not in ('practice','clinic','lab','imaging','pharmacy') then
    raise exception 'Invalid entity_type';
  end if;

  -- Authorization: enforce access in function too (extra safety)
  if not (
    v_is_super
    or (v_entity_type in ('practice','clinic') and public.can_access_entity('practice', p_entity_id))
    or (v_entity_type = 'lab' and public.can_access_entity('lab', p_entity_id))
    or (v_entity_type = 'imaging' and public.can_access_entity('imaging', p_entity_id))
    or (v_entity_type = 'pharmacy' and public.can_access_entity('pharmacy', p_entity_id))
  ) then
    raise exception 'Forbidden';
  end if;

  -- Only treat timezone as an update when the key is present.
  if (p_payload ? 'timezone') then
    v_timezone := nullif(p_payload->>'timezone','');
    if v_timezone is null then
      v_timezone := 'UTC';
    end if;
  end if;

  -- Facility verification check (timezone becomes locked after verification unless super_admin)
  if not v_is_super then
    if v_entity_type in ('practice','clinic') then
      select (coalesce(p.verified,false) or lower(coalesce(p.verification_status,'')) = 'verified')
        into v_is_verified
      from public.practices p
      where p.id = p_entity_id;
    elsif v_entity_type = 'lab' then
      select coalesce(lc.is_verified,false)
        into v_is_verified
      from public.lab_centers lc
      where lc.id = p_entity_id;
    elsif v_entity_type = 'imaging' then
      select coalesce(ic.is_verified,false)
        into v_is_verified
      from public.imaging_centers ic
      where ic.id = p_entity_id;
    elsif v_entity_type = 'pharmacy' then
      select (coalesce(ph.verified,false) or lower(coalesce(ph.verification_status,'')) = 'verified')
        into v_is_verified
      from public.pharmacies ph
      where ph.id = p_entity_id;
    end if;

    if v_is_verified and v_timezone is not null then
      select es.timezone
        into v_existing_timezone
      from public.entity_settings es
      where es.entity_type = v_entity_type
        and es.entity_id = p_entity_id
      limit 1;

      if v_existing_timezone is not null and v_timezone <> v_existing_timezone then
        raise exception 'Timezone locked';
      end if;
    end if;
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
    coalesce(v_timezone, 'UTC'),
    nullif(p_payload->>'logo_url',''),
    coalesce(p_payload->'hours', '{}'::jsonb),
    coalesce(p_payload->'notification_prefs', '{}'::jsonb),
    coalesce(p_payload->'billing_prefs', '{}'::jsonb),
    coalesce(p_payload->'integrations', '{}'::jsonb),
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
    country = excluded.country,
    timezone = coalesce(v_timezone, public.entity_settings.timezone),
    logo_url = excluded.logo_url,
    hours = excluded.hours,
    notification_prefs = excluded.notification_prefs,
    billing_prefs = excluded.billing_prefs,
    integrations = excluded.integrations,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.upsert_entity_settings(text, uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
