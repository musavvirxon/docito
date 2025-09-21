-- First ensure we have some verified practices in the database
INSERT INTO practices (name, city, country, description, verified, average_rating, num_reviews, weighted_rating, appointment_count)
VALUES 
  ('Heart & Soul Cardiology', 'New York', 'United States', 'Leading cardiology practice specializing in heart health and prevention.', true, 4.8, 45, 4.7, 125),
  ('Premier Dental Clinic', 'Los Angeles', 'United States', 'Modern dental practice offering comprehensive oral health services.', true, 4.6, 32, 4.5, 89),
  ('Family Health Center', 'Chicago', 'United States', 'Complete family medicine and primary care services.', true, 4.7, 67, 4.6, 203),
  ('Vision Care Specialists', 'Houston', 'United States', 'Advanced ophthalmology and eye care center.', true, 4.9, 28, 4.7, 76),
  ('Metro Pediatrics', 'Miami', 'United States', 'Specialized pediatric care for infants, children, and adolescents.', true, 4.8, 51, 4.7, 156)
ON CONFLICT (name) DO NOTHING;

-- Add some verified doctors with different specialties
INSERT INTO doctors (user_id, specialty, bio, verified, accepts_new_patients, practice_id, average_rating, num_reviews, weighted_rating, appointment_count)
SELECT 
  p.user_id,
  CASE 
    WHEN ROW_NUMBER() OVER() % 9 = 1 THEN 'Cardiologist'
    WHEN ROW_NUMBER() OVER() % 9 = 2 THEN 'Dermatologist' 
    WHEN ROW_NUMBER() OVER() % 9 = 3 THEN 'Neurologist'
    WHEN ROW_NUMBER() OVER() % 9 = 4 THEN 'Orthopedist'
    WHEN ROW_NUMBER() OVER() % 9 = 5 THEN 'Psychiatrist'
    WHEN ROW_NUMBER() OVER() % 9 = 6 THEN 'Ophthalmologist'
    WHEN ROW_NUMBER() OVER() % 9 = 7 THEN 'Pediatrician'
    WHEN ROW_NUMBER() OVER() % 9 = 8 THEN 'Dentist'
    ELSE 'Primary Care'
  END as specialty,
  'Experienced medical professional dedicated to providing quality healthcare to patients.' as bio,
  true,
  true,
  (SELECT id FROM practices ORDER BY random() LIMIT 1),
  4.2 + (random() * 0.8),
  floor(random() * 50 + 5)::INTEGER,
  0, -- Will be calculated by the refresh function
  0  -- Will be calculated by the refresh function
FROM profiles p
WHERE p.role = 'patient' -- Using patient profiles as placeholder doctors for testing
LIMIT 20
ON CONFLICT (user_id) DO UPDATE SET 
  specialty = EXCLUDED.specialty,
  bio = EXCLUDED.bio,
  verified = EXCLUDED.verified,
  accepts_new_patients = EXCLUDED.accepts_new_patients,
  average_rating = EXCLUDED.average_rating,
  num_reviews = EXCLUDED.num_reviews;

-- Refresh the weighted ratings
SELECT refresh_all_ratings();