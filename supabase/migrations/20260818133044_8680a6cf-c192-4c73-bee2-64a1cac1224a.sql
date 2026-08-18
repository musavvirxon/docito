CREATE OR REPLACE FUNCTION public.get_public_doctor_profile(slug_or_id text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  custom_profile_link text,
  full_name text,
  avatar_url text,
  gender text,
  specialty text,
  bio text,
  languages text[],
  consultation_fee numeric,
  verified boolean,
  years_experience integer,
  average_rating numeric,
  num_reviews integer,
  consultation_types text[],
  accepts_new_patients boolean,
  practice_id uuid,
  practice_name text,
  practice_city text,
  practice_country text,
  practice_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.id,
    d.user_id,
    p.username,
    d.custom_profile_link,
    p.full_name,
    p.avatar_url,
    p.gender::text,
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
    pr.name,
    pr.city,
    pr.country,
    pr.verified
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.practices pr ON pr.id = d.practice_id
  WHERE d.verified = true
    AND COALESCE(p.profile_visibility, 'public') <> 'private'
    AND (
      (slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND d.id = slug_or_id::uuid)
      OR d.custom_profile_link ILIKE slug_or_id
      OR p.username ILIKE slug_or_id
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_public_doctor_profiles()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  custom_profile_link text,
  full_name text,
  avatar_url text,
  specialty text,
  bio text,
  languages text[],
  consultation_fee numeric,
  verified boolean,
  years_experience integer,
  average_rating numeric,
  num_reviews integer,
  consultation_types text[],
  accepts_new_patients boolean,
  practice_id uuid,
  practice_name text,
  practice_city text,
  practice_country text,
  practice_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.id, d.user_id, p.username, d.custom_profile_link, p.full_name, p.avatar_url,
    d.specialty, d.bio, d.languages, d.consultation_fee, d.verified, d.years_experience,
    d.average_rating, d.num_reviews, d.consultation_types, d.accepts_new_patients,
    d.practice_id, pr.name, pr.city, pr.country, pr.verified
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.practices pr ON pr.id = d.practice_id
  WHERE d.verified = true
    AND COALESCE(p.profile_visibility, 'public') <> 'private';
$$;

GRANT EXECUTE ON FUNCTION public.list_public_doctor_profiles() TO anon, authenticated;