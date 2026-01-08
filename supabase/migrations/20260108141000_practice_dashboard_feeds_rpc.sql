begin;

-- ============================================================
-- Practice dashboard feed RPCs (locations, providers, services)
-- Access: practice admin OR active practice_staff only
-- ============================================================

-- 1) Helper access check
create or replace function public.can_access_practice(p_practice_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (
      select 1
      from public.practices p
      where p.id = p_practice_id
        and p.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.practice_staff ps
      where ps.practice_id = p_practice_id
        and ps.user_id = auth.uid()
        and coalesce(ps.status, 'active') = 'active'
    )
    or public.has_role(auth.uid(), 'super_admin');
$$;

grant execute on function public.can_access_practice(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2) Locations feed
-- ------------------------------------------------------------
create or replace function public.get_practice_locations(p_practice_id uuid)
returns table (
  id uuid,
  practice_id uuid,
  name text,
  address text,
  city text,
  phone text,
  is_primary boolean,
  photo_urls text[],
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select
    pl.id,
    pl.practice_id,
    pl.name,
    pl.address,
    pl.city,
    pl.phone,
    pl.is_primary,
    pl.photo_urls,
    pl.created_at
  from public.practice_locations pl
  where pl.practice_id = p_practice_id
    and public.can_access_practice(p_practice_id)
  order by pl.is_primary desc, pl.created_at desc;
$$;

grant execute on function public.get_practice_locations(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) Providers feed (doctors in practice + name from profiles)
-- ------------------------------------------------------------
create or replace function public.get_practice_providers(p_practice_id uuid)
returns table (
  doctor_id uuid,
  user_id uuid,
  full_name text,
  specialty text,
  verified boolean,
  average_rating numeric,
  num_reviews integer,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select
    d.id as doctor_id,
    d.user_id,
    pr.full_name,
    d.specialty,
    d.verified,
    d.average_rating,
    d.num_reviews,
    d.created_at
  from public.doctors d
  left join public.profiles pr
    on pr.user_id = d.user_id
  where d.practice_id = p_practice_id
    and public.can_access_practice(p_practice_id)
  order by d.created_at desc;
$$;

grant execute on function public.get_practice_providers(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Services feed (procedures for doctors in this practice)
-- ------------------------------------------------------------
create or replace function public.get_practice_services(p_practice_id uuid)
returns table (
  id uuid,
  name text,
  price numeric,
  duration_minutes integer,
  category text,
  dentist_id uuid,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select
    prc.id,
    prc.name,
    prc.price,
    prc.duration_minutes,
    prc.category,
    prc.dentist_id,
    prc.is_active,
    prc.created_at
  from public.procedures prc
  where prc.is_active = true
    and prc.dentist_id in (
      select d.id
      from public.doctors d
      where d.practice_id = p_practice_id
    )
    and public.can_access_practice(p_practice_id)
  order by prc.name asc;
$$;

grant execute on function public.get_practice_services(uuid) to authenticated;

commit;
