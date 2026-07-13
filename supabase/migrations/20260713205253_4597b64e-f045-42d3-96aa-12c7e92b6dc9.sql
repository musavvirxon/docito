
DROP VIEW IF EXISTS public.doctor_public_profile_view;

CREATE VIEW public.doctor_public_profile_view
WITH (security_invoker=on)
AS
SELECT
  d.id, d.user_id, p.username, d.custom_profile_link,
  p.full_name, p.avatar_url,
  NULL::text AS phone, NULL::text AS email, p.gender,
  d.specialty, d.bio, d.languages, d.consultation_fee, d.verified,
  d.years_experience, d.average_rating, d.num_reviews,
  d.consultation_types, d.accepts_new_patients, d.practice_id,
  pr.name AS practice_name,
  NULL::text AS practice_address,
  NULL::text AS practice_phone,
  pr.city AS practice_city,
  pr.country AS practice_country,
  pr.verified AS practice_verified
FROM doctors d
LEFT JOIN profiles p ON d.user_id = p.user_id
LEFT JOIN practices pr ON d.practice_id = pr.id
WHERE COALESCE(p.profile_visibility, 'public'::text) <> 'private'::text;

GRANT SELECT ON public.doctor_public_profile_view TO anon, authenticated;

DROP FUNCTION IF EXISTS public.homepage_unified_search(text, text);

CREATE OR REPLACE FUNCTION public.homepage_unified_search(search_query text, search_location text)
RETURNS TABLE(
  id uuid, name text, type text, specialty text, specialties text[],
  location text, rating numeric, "reviewCount" integer, image_url text,
  verified boolean, "acceptsInsurance" boolean, "deliveryAvailable" boolean,
  "servicesOffered" text[], "turnaroundHours" numeric,
  procedures text[], accreditations text[],
  practice_type text, message_user_id uuid
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, COALESCE(p.full_name, 'Unknown Doctor')::text, 'doctor'::text,
    d.specialty::text, NULL::text[], COALESCE(pr.city, '')::text,
    COALESCE(d.average_rating, 0)::numeric, COALESCE(d.num_reviews, 0)::integer,
    p.avatar_url::text, COALESCE(d.verified, false),
    NULL::boolean, NULL::boolean, NULL::text[], NULL::numeric, NULL::text[], NULL::text[],
    NULL::text, d.user_id
  FROM doctors d
  LEFT JOIN profiles p ON d.user_id = p.user_id
  LEFT JOIN practices pr ON d.practice_id = pr.id
  WHERE (search_query = '' OR LOWER(COALESCE(p.full_name, '')) ILIKE '%' || LOWER(search_query) || '%'
         OR LOWER(d.specialty) ILIKE '%' || LOWER(search_query) || '%')
    AND (search_location = '' OR LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%'
         OR LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')
  UNION ALL
  SELECT pr.id, pr.name::text, 'clinic'::text,
    COALESCE(array_to_string(pr.specialties, ', '), 'Clinic')::text,
    pr.specialties, COALESCE(pr.city, '')::text,
    COALESCE(pr.average_rating, 0)::numeric, COALESCE(pr.num_reviews, 0)::integer,
    pr.logo_url::text, COALESCE(pr.verified, false),
    NULL::boolean, NULL::boolean, NULL::text[], NULL::numeric, NULL::text[], NULL::text[],
    pr.practice_type::text, pr.admin_id
  FROM practices pr
  WHERE (search_query = '' OR LOWER(pr.name) ILIKE '%' || LOWER(search_query) || '%'
         OR LOWER(COALESCE(array_to_string(pr.specialties, ' '), '')) ILIKE '%' || LOWER(search_query) || '%')
    AND (search_location = '' OR LOWER(COALESCE(pr.city, '')) ILIKE '%' || LOWER(search_location) || '%'
         OR LOWER(COALESCE(pr.country, '')) ILIKE '%' || LOWER(search_location) || '%')
  UNION ALL
  SELECT l.id, l.name::text, 'lab'::text, COALESCE(l.type, 'Laboratory')::text,
    NULL::text[], COALESCE(l.city, '')::text, 0::numeric, 0::integer,
    l.logo_url::text, COALESCE(l.is_verified, false),
    l.accepts_insurance, NULL::boolean, l.services_offered, l.average_turnaround_hours,
    NULL::text[], l.accreditations, NULL::text, l.admin_id
  FROM lab_centers l
  WHERE (search_query = '' OR LOWER(l.name) ILIKE '%' || LOWER(search_query) || '%')
    AND (search_location = '' OR LOWER(COALESCE(l.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  UNION ALL
  SELECT ph.id, ph.name::text, 'pharmacy'::text, 'Pharmacy'::text,
    NULL::text[], COALESCE(ph.city, '')::text,
    COALESCE(ph.average_rating, 0)::numeric, COALESCE(ph.num_reviews, 0)::integer,
    ph.logo_url::text, COALESCE(ph.verified, false),
    ph.accepts_insurance, ph.delivery_available,
    NULL::text[], NULL::numeric, NULL::text[], NULL::text[],
    NULL::text, ph.admin_id
  FROM pharmacies ph
  WHERE (search_query = '' OR LOWER(ph.name) ILIKE '%' || LOWER(search_query) || '%')
    AND (search_location = '' OR LOWER(COALESCE(ph.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  UNION ALL
  SELECT ic.id, ic.name::text, 'imaging'::text,
    COALESCE(array_to_string(ic.modalities, ', '), 'Imaging')::text,
    NULL::text[], COALESCE(ic.city, '')::text,
    COALESCE(ic.average_rating, 0)::numeric, COALESCE(ic.num_reviews, 0)::integer,
    ic.logo_url::text, COALESCE(ic.is_verified, false),
    ic.accepts_insurance, NULL::boolean, NULL::text[], NULL::numeric,
    ic.modalities, ic.accreditations, NULL::text, ic.admin_id
  FROM imaging_centers ic
  WHERE (search_query = '' OR LOWER(ic.name) ILIKE '%' || LOWER(search_query) || '%')
    AND (search_location = '' OR LOWER(COALESCE(ic.city, '')) ILIKE '%' || LOWER(search_location) || '%')
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.homepage_unified_search(text, text) TO anon, authenticated;
