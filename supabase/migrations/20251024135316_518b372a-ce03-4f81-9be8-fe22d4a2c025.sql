-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.doctor_profiles_view;

-- Recreate the view without SECURITY DEFINER to respect RLS policies of the querying user
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
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url
FROM doctors d
LEFT JOIN profiles p ON p.user_id = d.user_id;