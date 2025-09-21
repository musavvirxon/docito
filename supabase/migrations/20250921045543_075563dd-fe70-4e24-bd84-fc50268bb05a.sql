-- First ensure we have some verified practices in the database
INSERT INTO practices (name, city, country, description, verified, average_rating, num_reviews, weighted_rating, appointment_count)
VALUES 
  ('Heart & Soul Cardiology', 'New York', 'United States', 'Leading cardiology practice specializing in heart health and prevention.', true, 4.8, 45, 4.7, 125),
  ('Premier Dental Clinic', 'Los Angeles', 'United States', 'Modern dental practice offering comprehensive oral health services.', true, 4.6, 32, 4.5, 89),
  ('Family Health Center', 'Chicago', 'United States', 'Complete family medicine and primary care services.', true, 4.7, 67, 4.6, 203),
  ('Vision Care Specialists', 'Houston', 'United States', 'Advanced ophthalmology and eye care center.', true, 4.9, 28, 4.7, 76),
  ('Metro Pediatrics', 'Miami', 'United States', 'Specialized pediatric care for infants, children, and adolescents.', true, 4.8, 51, 4.7, 156);

-- Update existing doctors with proper specialties and ratings
UPDATE doctors SET 
  specialty = CASE 
    WHEN random() < 0.1 THEN 'Cardiologist'
    WHEN random() < 0.2 THEN 'Dermatologist' 
    WHEN random() < 0.3 THEN 'Neurologist'
    WHEN random() < 0.4 THEN 'Orthopedist'
    WHEN random() < 0.5 THEN 'Psychiatrist'
    WHEN random() < 0.6 THEN 'Ophthalmologist'
    WHEN random() < 0.7 THEN 'Pediatrician'
    WHEN random() < 0.8 THEN 'Dentist'
    ELSE 'Primary Care'
  END,
  bio = 'Experienced medical professional dedicated to providing quality healthcare to patients.',
  verified = true,
  accepts_new_patients = true,
  average_rating = 4.2 + (random() * 0.8),
  num_reviews = floor(random() * 50 + 5)::INTEGER
WHERE verified = true;

-- Refresh the weighted ratings
SELECT refresh_all_ratings();