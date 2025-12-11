-- Drop and recreate doctor_profiles_view with all necessary columns
DROP VIEW IF EXISTS public.doctor_profiles_view;

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
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  pr.name as practice_name,
  pr.city as practice_city,
  pr.country as practice_country,
  pr.address as practice_address
FROM doctors d
LEFT JOIN profiles p ON d.user_id = p.user_id
LEFT JOIN practices pr ON d.practice_id = pr.id;