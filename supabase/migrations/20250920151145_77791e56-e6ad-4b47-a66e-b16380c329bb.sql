-- Fix database relationship error: "Could not find a relationship between 'doctors' and 'user_id'"
-- Add proper foreign key constraints and indexes

-- First, ensure all doctors.user_id values are valid (cleanup any orphaned records)
DELETE FROM doctors WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Add foreign key constraint from doctors.user_id to profiles.user_id
ALTER TABLE doctors 
ADD CONSTRAINT fk_doctors_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add index for better performance on doctors.user_id
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- Add unique constraint to ensure one doctor profile per user
ALTER TABLE doctors ADD CONSTRAINT unique_doctors_user_id UNIQUE (user_id);

-- Create a view to help refresh schema cache and ensure proper relationships
CREATE OR REPLACE VIEW doctor_profiles_view AS
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

-- Refresh the schema cache by updating table statistics
ANALYZE doctors;
ANALYZE profiles;