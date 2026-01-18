-- File: supabase/migrations/20260118201000_homepage_public_search_rpc.sql
-- Fix: Homepage search returns no results because public (anon) clients cannot read protected tables.
-- Approach: Provide a SAFE public RPC that returns ONLY non-sensitive fields for search results.
--          This avoids granting public SELECT on tables containing PII (e.g., profiles).

begin;

create or replace function public.homepage_unified_search(search_query text, search_location text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := nullif(btrim(coalesce(search_query, '')), '');
  loc text := nullif(btrim(coalesce(search_location, '')), '');
  q_like text := null;
  loc_like text := null;

  doctors jsonb;
  clinics jsonb;
  pharmacies jsonb;
  labs jsonb;
  imaging jsonb;
begin
  if q is not null then
    q_like := '%' || q || '%';
  end if;

  if loc is not null then
    loc_like := '%' || loc || '%';
  end if;

  -- Doctors (safe fields only; name/avatar pulled from profiles, but not exposed beyond these fields)
  doctors := (
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    from (
      select
        d.id,
        'doctor'::text as type,
        prf.full_name as name,
        d.specialty,
        array_remove(array[d.specialty], null) as specialties,
        d.weighted_rating as rating,
        coalesce(d.num_reviews, 0) as "reviewCount",
        prf.avatar_url as image,
        pr.name as "clinicAffiliation",
        case
          when pr.city is not null and pr.country is not null then pr.city || ', ' || pr.country
          else null
        end as location,
        d.consultation_fee as "consultationFee",
        coalesce(d.accepts_new_patients, true) as "acceptsNewPatients",
        d.languages
      from public.doctors d
      join public.profiles prf on prf.user_id = d.user_id
      left join public.practices pr on pr.id = d.practice_id
      where coalesce(d.verified, false) = true
        and (q_like is null or (
          d.specialty ilike q_like
          or coalesce(d.bio, '') ilike q_like
          or prf.full_name ilike q_like
        ))
        and (loc_like is null or (
          coalesce(pr.city, '') ilike loc_like
          or coalesce(pr.country, '') ilike loc_like
        ))
      order by d.weighted_rating desc nulls last, d.appointment_count desc nulls last
      limit 50
    ) r
  );

  -- Clinics (practices) - safe fields only
  clinics := (
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    from (
      select
        p.id,
        'clinic'::text as type,
        p.name,
        p.logo_url as image,
        case
          when p.city is not null and p.country is not null then p.city || ', ' || p.country
          else null
        end as location,
        coalesce(p.weighted_rating, p.average_rating) as rating,
        coalesce(p.num_reviews, 0) as "reviewCount",
        p.specialties
      from public.practices p
      where coalesce(p.verified, false) = true
        and (q_like is null or (
          p.name ilike q_like
          or coalesce(p.description, '') ilike q_like
        ))
        and (loc_like is null or (
          coalesce(p.city, '') ilike loc_like
          or coalesce(p.country, '') ilike loc_like
        ))
      order by coalesce(p.weighted_rating, p.average_rating) desc nulls last, p.appointment_count desc nulls last
      limit 50
    ) r
  );

  -- Pharmacies - safe fields only
  pharmacies := (
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    from (
      select
        ph.id,
        'pharmacy'::text as type,
        ph.name,
        ph.logo_url as image,
        case
          when ph.city is not null and ph.country is not null then ph.city || ', ' || ph.country
          else null
        end as location,
        coalesce(ph.delivery_available, false) as "deliveryAvailable",
        coalesce(ph.accepts_insurance, false) as "acceptsInsurance",
        ph.average_rating as rating,
        coalesce(ph.num_reviews, 0) as "reviewCount"
      from public.pharmacies ph
      where coalesce(ph.verified, false) = true
        and (q_like is null or ph.name ilike q_like)
        and (loc_like is null or (
          coalesce(ph.city, '') ilike loc_like
          or coalesce(ph.country, '') ilike loc_like
        ))
      order by ph.average_rating desc nulls last, ph.num_reviews desc nulls last
      limit 50
    ) r
  );

  -- Labs + Imaging (lab_centers) - safe fields only
  with centers as (
    select
      lc.id,
      lc.name,
      case
        when lc.city is not null and lc.country is not null then lc.city || ', ' || lc.country
        else null
      end as location,
      coalesce(lc.accepts_insurance, false) as "acceptsInsurance",
      lc.services_offered as services,
      lc.accreditations,
      lc.average_turnaround_hours as "turnaroundHours",
      lc.type,
      (
        lower(coalesce(lc.type, '')) like '%imaging%' or
        lower(coalesce(lc.type, '')) like '%radiology%' or
        exists (
          select 1
          from unnest(coalesce(lc.services_offered, '{}'::text[])) s
          where lower(s) like '%mri%'
             or lower(s) like '%ct%'
             or lower(s) like '%x-ray%'
             or lower(s) like '%xray%'
             or lower(s) like '%ultrasound%'
             or lower(s) like '%mammography%'
        )
      ) as is_imaging
    from public.lab_centers lc
    where coalesce(lc.is_verified, false) = true
      and (q_like is null or lc.name ilike q_like)
      and (loc_like is null or (
        coalesce(lc.city, '') ilike loc_like
        or coalesce(lc.country, '') ilike loc_like
      ))
    limit 50
  )
  select
    coalesce(
      jsonb_agg(
        to_jsonb((
          select r from (
            select
              c.id,
              'lab'::text as type,
              c.name,
              null::text as image,
              c.location,
              c."acceptsInsurance",
              c.services as "servicesOffered",
              c."turnaroundHours"
          ) r
        ))
      ) filter (where is_imaging = false),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(
        to_jsonb((
          select r from (
            select
              c.id,
              'imaging'::text as type,
              c.name,
              null::text as image,
              c.location,
              c."acceptsInsurance",
              c.services as procedures,
              c.accreditations
          ) r
        ))
      ) filter (where is_imaging = true),
      '[]'::jsonb
    )
  into labs, imaging
  from centers c;

  return jsonb_build_object(
    'doctors', doctors,
    'clinics', clinics,
    'pharmacies', pharmacies,
    'labs', labs,
    'imaging', imaging
  );
end;
$$;

grant execute on function public.homepage_unified_search(text, text) to anon, authenticated;

commit;
