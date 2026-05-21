
CREATE POLICY "Practice can view doctor patients"
ON public.doctor_patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_patients.doctor_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);

CREATE POLICY "Practice can update doctor patients"
ON public.doctor_patients FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_patients.doctor_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_patients.doctor_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);
