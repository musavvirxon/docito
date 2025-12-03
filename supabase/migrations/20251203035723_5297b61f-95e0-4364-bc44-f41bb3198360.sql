-- First, unlink any doctors from these sample practices
UPDATE doctors 
SET practice_id = NULL 
WHERE practice_id IN (
  SELECT id FROM practices 
  WHERE name IN (
    'Vision Care Specialists',
    'Heart & Soul Cardiology',
    'Metro Pediatrics',
    'Family Health Center',
    'Premier Dental Clinic'
  )
);

-- Delete any appointments linked to these practices
DELETE FROM appointments 
WHERE practice_id IN (
  SELECT id FROM practices 
  WHERE name IN (
    'Vision Care Specialists',
    'Heart & Soul Cardiology',
    'Metro Pediatrics',
    'Family Health Center',
    'Premier Dental Clinic'
  )
);

-- Delete any practice locations
DELETE FROM practice_locations 
WHERE practice_id IN (
  SELECT id FROM practices 
  WHERE name IN (
    'Vision Care Specialists',
    'Heart & Soul Cardiology',
    'Metro Pediatrics',
    'Family Health Center',
    'Premier Dental Clinic'
  )
);

-- Delete any practice join requests
DELETE FROM practice_join_requests 
WHERE practice_id IN (
  SELECT id FROM practices 
  WHERE name IN (
    'Vision Care Specialists',
    'Heart & Soul Cardiology',
    'Metro Pediatrics',
    'Family Health Center',
    'Premier Dental Clinic'
  )
);

-- Finally delete the sample practices
DELETE FROM practices 
WHERE name IN (
  'Vision Care Specialists',
  'Heart & Soul Cardiology',
  'Metro Pediatrics',
  'Family Health Center',
  'Premier Dental Clinic'
);