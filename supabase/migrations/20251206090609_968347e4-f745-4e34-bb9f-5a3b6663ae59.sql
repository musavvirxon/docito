-- Fix 1: Update profiles RLS policy to only allow doctor access to patients with recent appointments (within 12 months)
DROP POLICY IF EXISTS "Doctors can view patient profiles with appointments" ON public.profiles;

CREATE POLICY "Doctors can view patient profiles with recent appointments"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = profiles.user_id 
      AND d.user_id = auth.uid()
      AND a.appointment_date >= (CURRENT_DATE - INTERVAL '12 months')
  )
);

-- Fix 2: Add UPDATE policy for appointments - doctors can update their appointments
CREATE POLICY "Doctors can update their appointments"
ON public.appointments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = appointments.doctor_id 
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = appointments.doctor_id 
      AND d.user_id = auth.uid()
  )
);

-- Fix 2b: Add UPDATE policy for appointments - patients can cancel their own pending appointments
CREATE POLICY "Patients can update their own pending appointments"
ON public.appointments
FOR UPDATE
USING (
  auth.uid() = patient_id 
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  auth.uid() = patient_id
);

-- Fix 2c: Add DELETE policy for appointments - only doctors can delete
CREATE POLICY "Doctors can delete their appointments"
ON public.appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = appointments.doctor_id 
      AND d.user_id = auth.uid()
  )
);

-- Fix 3: Update avatars bucket with file type and size restrictions
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';