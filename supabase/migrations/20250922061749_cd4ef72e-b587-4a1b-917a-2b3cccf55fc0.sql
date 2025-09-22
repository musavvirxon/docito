-- Create sample doctors that don't require auth.users entries
-- We'll modify the doctors table to make user_id nullable for sample data
ALTER TABLE doctors ALTER COLUMN user_id DROP NOT NULL;

-- Insert sample doctors without user_id to avoid foreign key issues
DO $$
DECLARE
    practice_id_1 UUID;
    practice_id_2 UUID;
    practice_id_3 UUID;
BEGIN
    -- Get some practice IDs
    SELECT id INTO practice_id_1 FROM practices WHERE name = 'Premier Dental Clinic' LIMIT 1;
    SELECT id INTO practice_id_2 FROM practices WHERE name = 'Heart & Soul Cardiology' LIMIT 1;
    SELECT id INTO practice_id_3 FROM practices WHERE name = 'Vision Care Specialists' LIMIT 1;

    -- Insert sample doctors with sample data
    INSERT INTO doctors (id, specialty, license_number, practice_id, consultation_fee, verified, accepts_new_patients, bio, average_rating, num_reviews, weighted_rating, appointment_count) VALUES
    (gen_random_uuid(), 'Cardiologist', 'MD-CARD-2018-001', practice_id_2, 250.00, true, true, 'Board-certified cardiologist with 15+ years of experience in treating heart conditions and cardiovascular diseases.', 4.9, 87, 4.85, 23),
    (gen_random_uuid(), 'Dentist', 'DDS-DENT-2020-045', practice_id_1, 150.00, true, true, 'General dentist specializing in preventive care, cosmetic dentistry, and oral health maintenance.', 4.8, 92, 4.78, 31),
    (gen_random_uuid(), 'Dermatologist', 'MD-DERM-2019-023', NULL, 200.00, true, true, 'Dermatologist specializing in skin cancer detection, acne treatment, and cosmetic dermatology procedures.', 4.7, 56, 4.72, 18),
    (gen_random_uuid(), 'Ophthalmologist', 'MD-OPHT-2017-012', practice_id_3, 180.00, true, true, 'Eye specialist with expertise in cataract surgery, retinal disorders, and comprehensive eye care.', 4.9, 74, 4.87, 27),
    (gen_random_uuid(), 'Pediatrician', 'MD-PEDS-2021-067', NULL, 120.00, true, true, 'Pediatrician dedicated to providing comprehensive healthcare for infants, children, and adolescents.', 4.8, 108, 4.81, 42);

    -- Update weighted ratings
    PERFORM update_doctor_weighted_ratings();
    
END $$;