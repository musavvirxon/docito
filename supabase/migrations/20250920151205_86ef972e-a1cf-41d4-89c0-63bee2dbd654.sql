-- Fix security definer view issue
-- Drop the problematic view and recreate without SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS doctor_profiles_view;

-- Recreate the view without SECURITY DEFINER (uses invoker's permissions instead)
CREATE VIEW doctor_profiles_view AS
SELECT 
  d.*,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url
FROM doctors d
JOIN profiles p ON p.user_id = d.user_id;

-- Grant appropriate permissions on the view
GRANT SELECT ON doctor_profiles_view TO authenticated;