-- Recreate doctor_public_profile_view so anonymous visitors can resolve
-- verified, public-facing doctors by username, custom link, or id.
-- We deliberately drop security_invoker so the view bypasses the strict
-- profiles RLS (which requires profiles.is_verified). The view itself only
-- exposes public-safe fields and filters to verified doctors with a
-- non-private profile_visibility.

DROP VIEW IF EXISTS public.doctor_public_profile_view CASCADE;

CREATE VIEW public.doctor_public_profile_view AS
SELECT
  d.id,
  d.user_id,
  p.username,
  d.custom_profile_link,
  p.full_name,
  p.avatar_url,
  NULL::text AS phone,
  NULL::text AS email,
  p.gender,
  d.specialty,
  d.bio,
  d.languages,
  d.consultation_fee,
  d.verified,
  d.years_experience,
  d.average_rating,
  d.num_reviews,
  d.consultation_types,
  d.accepts_new_patients,
  d.practice_id,
  pr.name        AS practice_name,
  NULL::text     AS practice_address,
  NULL::text     AS practice_phone,
  pr.city        AS practice_city,
  pr.country     AS practice_country,
  pr.verified    AS practice_verified
FROM public.doctors d
LEFT JOIN public.profiles p  ON d.user_id = p.user_id
LEFT JOIN public.practices pr ON d.practice_id = pr.id
WHERE d.verified = true
  AND COALESCE(p.profile_visibility, 'public') <> 'private';

GRANT SELECT ON public.doctor_public_profile_view TO anon, authenticated;
