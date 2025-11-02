-- Fix: Patient profile data exposed to all doctors
-- Add appointment-based access control for patient profiles

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policies with appointment-based access control
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient profiles with appointments"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = profiles.user_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Fix: Medical records lack appointment-based access
-- Drop existing policies
DROP POLICY IF EXISTS "Patients can view own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Authorized users can manage medical records" ON public.medical_records;

-- Create new policies with appointment-based access
CREATE POLICY "Patients can view own medical records"
ON public.medical_records FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own medical records"
ON public.medical_records FOR ALL
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view records of appointment patients"
ON public.medical_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = medical_records.patient_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can create records for appointment patients"
ON public.medical_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = medical_records.patient_id
    AND d.user_id = auth.uid()
    AND d.user_id = medical_records.added_by
  )
);

CREATE POLICY "Doctors can update records for appointment patients"
ON public.medical_records FOR UPDATE
USING (
  auth.uid() = added_by AND
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = medical_records.patient_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all medical records"
ON public.medical_records FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));