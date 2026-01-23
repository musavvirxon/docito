DROP POLICY IF EXISTS "Doctors can view patient profiles with appointments" ON public.profiles;

CREATE POLICY "Doctors can view patient profiles with appointments"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
      AND a.patient_id IS NOT NULL
      AND (
        a.patient_id = public.profiles.id
        OR a.patient_id = public.profiles.user_id
      )
  )
);
