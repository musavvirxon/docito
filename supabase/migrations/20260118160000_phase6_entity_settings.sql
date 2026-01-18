-- File: supabase/migrations/20260118160000_phase6_entity_settings.sql
begin;

-- ============================================================
-- Phase 6: Unified entity settings (clinic/practice, lab, imaging, pharmacy)
-- - One table: entity_settings
-- - RLS: only members of that entity can read/write
-- - Helpers: get_entity_settings / upsert_entity_settings
-- ============================================================

create table if not exists public.entity_settings (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('practice','clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  display_name text,
  phone text,
  email text,
  website text,

  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text,

  timezone text default 'UTC',
  logo_url text,

  hours jsonb not null default '{}'::jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  billing_prefs jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint entity_settings_unique unique (entity_type, entity_id)
);

create index if not exists idx_entity_settings_entity on public.entity_settings(entity_type, entity_id);

alter table public.entity_settings enable row level security;

-- Read policy
drop policy if exists "Entity members can read settings" on public.entity_settings;
create policy "Entity members can read settings"
on public.entity_settings
for select
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or (entity_type in ('practice','clinic') and public.can_access_entity('practice', entity_id))
  or (entity_type = 'lab' and public.can_access_entity('lab', entity_id))
  or (entity_type = 'imaging' and public.can_access_entity('imaging', entity_id))
  or (entity_type = 'pharmacy' and public.can_access_entity('pharmacy', entity_id))
);

-- Update policy
drop policy if exists "Entity members can update settings" on public.entity_settings;
create policy "Entity members can update settings"
on public.entity_settings
for update
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or (entity_type in ('practice','clinic') and public.can_access_entity('practice', entity_id))
  or (entity_type = 'lab' and public.can_access_entity('lab', entity_id))
  or (entity_type = 'imaging' and public.can_access_entity('imaging', entity_id))
  or (entity_type = 'pharmacy' and public.can_access_entity('pharmacy', entity_id))
)
with check (
  public.has_role(auth.uid(), 'super_admin')
  or (entity_type in ('practice','clinic') and public.can_access_entity('practice', entity_id))
  or (entity_type = 'lab' and public.can_access_entity('lab', entity_id))
  or (entity_type = 'imaging' and public.can_access_entity('imaging', entity_id))
  or (entity_type = 'pharmacy' and public.can_access_entity('pharmacy', entity_id))
);

-- Insert policy (allow upsert/insert by entity members)
drop policy if exists "Entity members can insert settings" on public.entity_settings;
create policy "Entity members can insert settings"
on public.entity_settings
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'super_admin')
  or (entity_type in ('practice','clinic') and public.can_access_entity('practice', entity_id))
  or (entity_type = 'lab' and public.can_access_entity('lab', entity_id))
  or (entity_type = 'imaging' and public.can_access_entity('imaging', entity_id))
  or (entity_type = 'pharmacy' and public.can_access_entity('pharmacy', entity_id))
);

-- ------------------------------------------------------------
-- RPC: get_entity_settings
-- ------------------------------------------------------------
create or replace function public.get_entity_settings(p_entity_type text, p_entity_id uuid)
returns public.entity_settings
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.entity_settings
  where entity_type = lower(p_entity_type)
    and entity_id = p_entity_id
  limit 1;
$$;

grant execute on function public.get_entity_settings(text, uuid) to authenticated;

-- ------------------------------------------------------------
-- RPC: upsert_entity_settings
-- ------------------------------------------------------------
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
    coalesce(nullif(p_payload->>'timezone',''), 'UTC'),
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
    timezone = excluded.timezone,
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
