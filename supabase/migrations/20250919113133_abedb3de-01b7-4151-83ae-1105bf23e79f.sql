-- Check and add missing foreign key constraints only if they don't exist

-- Add foreign key constraint for appointments.patient_id -> profiles.user_id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_patient_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_patient_id_fkey
        FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for appointments.doctor_id -> doctors.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_doctor_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_doctor_id_fkey  
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for appointments.practice_id -> practices.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_practice_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_practice_id_fkey
        FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for doctors.practice_id -> practices.id (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'doctors_practice_id_fkey' 
        AND table_name = 'doctors'
    ) THEN
        ALTER TABLE doctors
        ADD CONSTRAINT doctors_practice_id_fkey
        FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraints for treatment_plans (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'treatment_plans_patient_id_fkey' 
        AND table_name = 'treatment_plans'
    ) THEN
        ALTER TABLE treatment_plans
        ADD CONSTRAINT treatment_plans_patient_id_fkey
        FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'treatment_plans_doctor_id_fkey' 
        AND table_name = 'treatment_plans'
    ) THEN
        ALTER TABLE treatment_plans  
        ADD CONSTRAINT treatment_plans_doctor_id_fkey
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for procedures (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'procedures_dentist_id_fkey' 
        AND table_name = 'procedures'
    ) THEN
        ALTER TABLE procedures
        ADD CONSTRAINT procedures_dentist_id_fkey
        FOREIGN KEY (dentist_id) REFERENCES doctors(id) ON DELETE CASCADE;
    END IF;
END $$;