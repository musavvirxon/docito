-- Add doctor_patient_id column to treatment_plans for non-registered patients
ALTER TABLE public.treatment_plans
ADD COLUMN IF NOT EXISTS doctor_patient_id uuid REFERENCES public.doctor_patients(id);

-- Add expires_at column for 7-day expiration for non-registered patients
ALTER TABLE public.treatment_plans
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for doctor_patient_id
CREATE INDEX IF NOT EXISTS idx_treatment_plans_doctor_patient_id 
ON public.treatment_plans(doctor_patient_id) 
WHERE doctor_patient_id IS NOT NULL;

-- Update RLS policy to allow doctors to create plans for their doctor_patients
DROP POLICY IF EXISTS "Doctors can manage their treatment plans" ON public.treatment_plans;

CREATE POLICY "Doctors can manage their treatment plans"
ON public.treatment_plans FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = treatment_plans.doctor_id 
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = treatment_plans.doctor_id 
    AND d.user_id = auth.uid()
  )
);

-- Add policy for patients to view their own treatment plans (including linked via doctor_patients)
DROP POLICY IF EXISTS "Patients can view their treatment plans" ON public.treatment_plans;

CREATE POLICY "Patients can view their treatment plans"
ON public.treatment_plans FOR SELECT
USING (
  patient_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM doctor_patients dp
    JOIN profiles p ON p.phone = dp.phone
    WHERE dp.id = treatment_plans.doctor_patient_id
    AND p.user_id = auth.uid()
  )
);