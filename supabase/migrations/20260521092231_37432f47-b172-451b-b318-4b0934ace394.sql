
CREATE POLICY "Practice can view doctor procedures"
ON public.procedures FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);

CREATE POLICY "Practice can insert doctor procedures"
ON public.procedures FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);

CREATE POLICY "Practice can update doctor procedures"
ON public.procedures FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);

CREATE POLICY "Practice can delete doctor procedures"
ON public.procedures FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = procedures.dentist_id
      AND d.practice_id IS NOT NULL
      AND public.can_access_practice(d.practice_id)
  )
);
