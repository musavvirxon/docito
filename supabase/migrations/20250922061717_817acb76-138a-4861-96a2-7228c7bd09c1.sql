-- Add sample verified doctors with profiles and practice associations
DO $$
DECLARE
    user_id_1 UUID := gen_random_uuid();
    user_id_2 UUID := gen_random_uuid();
    user_id_3 UUID := gen_random_uuid();
    user_id_4 UUID := gen_random_uuid();
    user_id_5 UUID := gen_random_uuid();
    doctor_id_1 UUID;
    doctor_id_2 UUID;
    doctor_id_3 UUID;
    doctor_id_4 UUID;
    doctor_id_5 UUID;
    practice_id_1 UUID;
    practice_id_2 UUID;
    practice_id_3 UUID;
BEGIN
    -- Get some practice IDs
    SELECT id INTO practice_id_1 FROM practices WHERE name = 'Premier Dental Clinic' LIMIT 1;
    SELECT id INTO practice_id_2 FROM practices WHERE name = 'Heart & Soul Cardiology' LIMIT 1;
    SELECT id INTO practice_id_3 FROM practices WHERE name = 'Vision Care Specialists' LIMIT 1;

    -- Insert user profiles for doctors
    INSERT INTO profiles (user_id, full_name, email, role, avatar_url, phone) VALUES
    (user_id_1, 'Dr. Sarah Johnson', 'sarah.johnson@example.com', 'doctor', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', '+1-555-0101'),
    (user_id_2, 'Dr. Michael Chen', 'michael.chen@example.com', 'doctor', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400', '+1-555-0102'),
    (user_id_3, 'Dr. Emily Rodriguez', 'emily.rodriguez@example.com', 'doctor', 'https://images.unsplash.com/photo-1594824694066-0abb0a42ad50?w=400', '+1-555-0103'),
    (user_id_4, 'Dr. David Kim', 'david.kim@example.com', 'doctor', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400', '+1-555-0104'),
    (user_id_5, 'Dr. Lisa Thompson', 'lisa.thompson@example.com', 'doctor', 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400', '+1-555-0105');

    -- Insert doctors with verified status and proper data
    INSERT INTO doctors (id, user_id, specialty, license_number, practice_id, consultation_fee, verified, accepts_new_patients, bio, average_rating, num_reviews, weighted_rating, appointment_count) VALUES
    (gen_random_uuid(), user_id_1, 'Cardiologist', 'MD-CARD-2018-001', practice_id_2, 250.00, true, true, 'Board-certified cardiologist with 15+ years of experience in treating heart conditions and cardiovascular diseases.', 4.9, 87, 4.85, 23),
    (gen_random_uuid(), user_id_2, 'Dentist', 'DDS-DENT-2020-045', practice_id_1, 150.00, true, true, 'General dentist specializing in preventive care, cosmetic dentistry, and oral health maintenance.', 4.8, 92, 4.78, 31),
    (gen_random_uuid(), user_id_3, 'Dermatologist', 'MD-DERM-2019-023', NULL, 200.00, true, true, 'Dermatologist specializing in skin cancer detection, acne treatment, and cosmetic dermatology procedures.', 4.7, 56, 4.72, 18),
    (gen_random_uuid(), user_id_4, 'Ophthalmologist', 'MD-OPHT-2017-012', practice_id_3, 180.00, true, true, 'Eye specialist with expertise in cataract surgery, retinal disorders, and comprehensive eye care.', 4.9, 74, 4.87, 27),
    (gen_random_uuid(), user_id_5, 'Pediatrician', 'MD-PEDS-2021-067', NULL, 120.00, true, true, 'Pediatrician dedicated to providing comprehensive healthcare for infants, children, and adolescents.', 4.8, 108, 4.81, 42);

    -- Update weighted ratings
    PERFORM update_doctor_weighted_ratings();
    PERFORM update_practice_weighted_ratings();
    
END $$;