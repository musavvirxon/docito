-- Fix doctor_profiles_view: recreate with security_invoker=on
DROP VIEW IF EXISTS public.doctor_profiles_view CASCADE;

CREATE VIEW public.doctor_profiles_view
WITH (security_invoker=on) AS
SELECT d.id,
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