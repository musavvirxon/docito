-- ============================================================
-- Enrich homepage_unified_search for pharmacy/lab/imaging/clinic
-- ============================================================
-- The search cards (PharmacySearchCard, LabSearchCard,
-- ImagingSearchCard, ClinicSearchCard) and useUnifiedSearch's
-- normalizeRpcResults() already expect fields like
-- deliveryAvailable, acceptsInsurance, servicesOffered,
-- turnaroundHours, procedures, accreditations, specialties, and
-- reviewCount — but the current homepage_unified_search only
-- returns id/name/type/specialty/location/rating/image_url/verified,
-- so those cards have been rendering with the badges/tags for that
-- extra data silently empty. This adds the missing columns.
--
-- The doctor branch is left functionally unchanged (still exactly
-- what it selected before) — this only enriches clinic, pharmacy,
-- lab, and imaging, since those are the four in scope right now.
--
-- Column names that the frontend reads in camelCase MUST be
-- double-quoted here, or Postgres will fold them to lowercase and
-- normalizeRpcResults() won't find them.

DROP FUNCTION IF EXISTS homepage_unified_search(text, text);

CREATE OR REPLACE FUNCTION homepage_unified_search(search_query text, search_location text)
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  specialty text,
  specialties text[],
  location text,
  rating numeric,
  "reviewCount" integer,
  image_url text,
  verified boolean,
  "acceptsInsurance" boolean,
  "deliveryAvailable" boolean,
  "servicesOffered" text[],
  "turnaroundHours" numeric,
  procedures text[],
  accreditations text[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Search doctors — unchanged from before, just padded with NULLs
  -- for the new columns so the UNION ALL type-matches.
  SELECT
    d.id,
    COALESCE(p.full_name, 'Unknown Doctor')::text as name,
    'doctor'::text as type,
    d.specialty::text,
    NULL::text[] as specialties,
    COALESCE(pr.city, '')::text as location,
    COALESCE(d.average_rating, 0)::numeric as rating,
    COALESCE(d.num_reviews, 0)::integer as "reviewCount",
    p.avatar_url::text as image_url,
    COALESCE(d.verified, false) as verified,
    NULL::boolean as "acceptsInsurance",
    NULL::boolean as "deliveryAvailable",
    NULL::text[] as "servicesOffered",
    NULL::numeric as "turnaroundHours",
    NULL::text[] as procedures,
    NULL::text[] as accreditations
  FROM doctors d
  LEFT JOIN profiles p ON d.user_id = p.user_id
  LEFT JOIN practices pr ON d.practice_id = pr.id
  WHERE
    (search_query = '' OR
     LOWER(COALESCE(p.full_name, '')) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(d.specialty) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')

  UNION ALL

  -- Search practices/clinics
  SELECT
    pr.id,
    pr.name::text,
    'clinic'::text as type,
    COALESCE(array_to_string(pr.specialties, ', '), 'Clinic')::text as specialty,
    pr.specialties as specialties,
    COALESCE(pr.city, '')::text as location,
    COALESCE(pr.average_rating, 0)::numeric as rating,
    COALESCE(pr.num_reviews, 0)::integer as "reviewCount",
    pr.logo_url::text as image_url,
    COALESCE(pr.verified, false) as verified,
    NULL::boolean as "acceptsInsurance",
    NULL::boolean as "deliveryAvailable",
    NULL::text[] as "servicesOffered",
    NULL::numeric as "turnaroundHours",
    NULL::text[] as procedures,
    NULL::text[] as accreditations
  FROM practices pr
  WHERE
    (search_query = '' OR
     LOWER(pr.name) ILIKE '%' || LOWER(search_query) || '%' OR
     LOWER(COALESCE(array_to_string(pr.specialties, ' '), '')) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR
     LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%' OR
     LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')

  UNION ALL

  -- Search labs
  SELECT
    l.id,
    l.name::text,
    'lab'::text as type,
    COALESCE(l.type, 'Laboratory')::text as specialty,
    NULL::text[] as specialties,
    COALESCE(l.city, '')::text as location,
    0::numeric as rating,
    0::integer as "reviewCount",
    l.logo_url::text as image_url,
    COALESCE(l.is_verified, false) as verified,
    l.accepts_insurance as "acceptsInsurance",
    NULL::boolean as "deliveryAvailable",
    l.services_offered as "servicesOffered",
    l.average_turnaround_hours as "turnaroundHours",
    NULL::text[] as procedures,
    l.accreditations as accreditations
  FROM lab_centers l
  WHERE
    (search_query = '' OR
     LOWER(l.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR
     LOWER(COALESCE(l.city, '')) ILIKE '%' || LOWER(search_location) || '%')

  UNION ALL

  -- Search pharmacies
  SELECT
    ph.id,
    ph.name::text,
    'pharmacy'::text as type,
    'Pharmacy'::text as specialty,
    NULL::text[] as specialties,
    COALESCE(ph.city, '')::text as location,
    COALESCE(ph.average_rating, 0)::numeric as rating,
    COALESCE(ph.num_reviews, 0)::integer as "reviewCount",
    ph.logo_url::text as image_url,
    COALESCE(ph.verified, false) as verified,
    ph.accepts_insurance as "acceptsInsurance",
    ph.delivery_available as "deliveryAvailable",
    NULL::text[] as "servicesOffered",
    NULL::numeric as "turnaroundHours",
    NULL::text[] as procedures,
    NULL::text[] as accreditations
  FROM pharmacies ph
  WHERE
    (search_query = '' OR
     LOWER(ph.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR
     LOWER(COALESCE(ph.city, '')) ILIKE '%' || LOWER(search_location) || '%')

  UNION ALL

  -- Search imaging centers
  SELECT
    ic.id,
    ic.name::text,
    'imaging'::text as type,
    COALESCE(array_to_string(ic.modalities, ', '), 'Imaging')::text as specialty,
    NULL::text[] as specialties,
    COALESCE(ic.city, '')::text as location,
    COALESCE(ic.average_rating, 0)::numeric as rating,
    COALESCE(ic.num_reviews, 0)::integer as "reviewCount",
    ic.logo_url::text as image_url,
    COALESCE(ic.is_verified, false) as verified,
    ic.accepts_insurance as "acceptsInsurance",
    NULL::boolean as "deliveryAvailable",
    NULL::text[] as "servicesOffered",
    NULL::numeric as "turnaroundHours",
    ic.modalities as procedures,
    ic.accreditations as accreditations
  FROM imaging_centers ic
  WHERE
    (search_query = '' OR
     LOWER(ic.name) ILIKE '%' || LOWER(search_query) || '%')
    AND
    (search_location = '' OR
     LOWER(COALESCE(ic.city, '')) ILIKE '%' || LOWER(search_location) || '%')

  LIMIT 20;
END;
$$;
