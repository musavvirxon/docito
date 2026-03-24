
DROP VIEW IF EXISTS public.doctor_profiles_view CASCADE;

CREATE VIEW public.doctor_profiles_view AS
SELECT
  d.id,
  d.user_id,
  d.specialty,
  d.bio,
  d.license_number,
  d.consultation_fee,
  d.verified,
  d.accepts_new_patients,
  d.practice_id,
  d.created_at,
  d.average_rating,
  d.weighted_rating,
  d.num_reviews,
  d.appointment_count,
  d.consultation_types,
  d.languages,
  d.years_experience,
  d.custom_profile_link,
  d.logo_url,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  p.gender,
  p.username,
  p.profile_visibility,
  p.address AS profile_address,
  pr.name AS practice_name,
  pr.city AS practice_city,
  pr.country AS practice_country,
  pr.address AS practice_address
FROM doctors d
LEFT JOIN profiles p ON d.user_id = p.user_id
LEFT JOIN practices pr ON d.practice_id = pr.id;

CREATE VIEW public.doctor_public_profile_view
WITH (security_invoker = on) AS
SELECT
  d.id,
  d.user_id,
  p.username,
  d.custom_profile_link,
  p.full_name,
  p.avatar_url,
  p.phone,
  p.email,
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
  pr.name AS practice_name,
  pr.address AS practice_address,
  pr.phone AS practice_phone,
  pr.city AS practice_city,
  pr.country AS practice_country,
  pr.verified AS practice_verified
FROM doctors d
LEFT JOIN profiles p ON d.user_id = p.user_id
LEFT JOIN practices pr ON d.practice_id = pr.id
WHERE d.verified = true
  AND COALESCE(p.profile_visibility, 'public') != 'private';

CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  content JSONB DEFAULT '{}',
  image_url TEXT DEFAULT '',
  cta_text TEXT DEFAULT '',
  cta_link TEXT DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible landing sections"
  ON public.landing_sections FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Super admins can manage landing sections"
  ON public.landing_sections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
