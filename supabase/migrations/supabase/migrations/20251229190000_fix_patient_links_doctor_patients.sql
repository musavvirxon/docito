-- Allow appointments & treatment plans to link either:
-- 1) registered patient (auth user) via patient_id
-- 2) doctor-added patient via doctor_patient_id

-- 1) Add columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS doctor_patient_id uuid;

ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS doctor_patient_id uuid;

-- 2) Drop conflicting / old constraints if they exist (safe)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

ALTER TABLE public.treatment_plans
  DROP CONSTRAINT IF EXISTS treatment_plans_patient_id_fkey;

-- 3) Re-add patient_id FK to auth.users (matches your schema)
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4) Add FK to doctor_patients
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_doctor_patient_id_fkey
  FOREIGN KEY (doctor_patient_id) REFERENCES public.doctor_patients(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_doctor_patient_id_fkey
  FOREIGN KEY (doctor_patient_id) REFERENCES public.doctor_patients(id) ON DELETE CASCADE;

-- 5) Enforce "exactly one" patient reference
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_ref_check
  CHECK (
    (patient_id IS NOT NULL AND doctor_patient_id IS NULL)
    OR
    (patient_id IS NULL AND doctor_patient_id IS NOT NULL)
  );

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_patient_ref_check
  CHECK (
    (patient_id IS NOT NULL AND doctor_patient_id IS NULL)
    OR
    (patient_id IS NULL AND doctor_patient_id IS NOT NULL)
  );

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_patient_id ON public.appointments(doctor_patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_doctor_patient_id ON public.treatment_plans(doctor_patient_id);
