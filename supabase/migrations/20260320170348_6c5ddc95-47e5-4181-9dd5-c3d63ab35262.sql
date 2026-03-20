-- Tighten privacy for doctor-created diagnoses so only the owner doctor can read/write them
DROP POLICY IF EXISTS "Patients can view their own diagnoses" ON public.appointment_diagnoses;
DROP POLICY IF EXISTS "Doctors can manage their appointment diagnoses" ON public.appointment_diagnoses;

CREATE POLICY "Doctors can view own appointment diagnoses"
ON public.appointment_diagnoses
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = appointment_diagnoses.doctor_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can insert own appointment diagnoses"
ON public.appointment_diagnoses
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = appointment_diagnoses.doctor_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can update own appointment diagnoses"
ON public.appointment_diagnoses
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = appointment_diagnoses.doctor_id
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = appointment_diagnoses.doctor_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can delete own appointment diagnoses"
ON public.appointment_diagnoses
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = appointment_diagnoses.doctor_id
      AND d.user_id = auth.uid()
  )
);

-- Tighten privacy for doctor procedures so only the owner doctor can read/write them
DROP POLICY IF EXISTS "Authenticated users can view procedures" ON public.procedures;
DROP POLICY IF EXISTS "Public can view active procedures" ON public.procedures;
DROP POLICY IF EXISTS "Doctors can manage own procedures" ON public.procedures;
DROP POLICY IF EXISTS "Procedures: doctor owns" ON public.procedures;

CREATE POLICY "Doctors can view own procedures"
ON public.procedures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can insert own procedures"
ON public.procedures
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can update own procedures"
ON public.procedures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can delete own procedures"
ON public.procedures
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.user_id = auth.uid()
  )
);