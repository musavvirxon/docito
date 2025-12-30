-- 0) Ensure RLS is enabled
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- 1) Fix old rows that accidentally stored dentist_id = doctors.user_id (auth uid)
UPDATE public.procedures p
SET dentist_id = d.id
FROM public.doctors d
WHERE p.dentist_id = d.user_id;

-- 2) Recreate policy with explicit WITH CHECK (required for INSERT)
DROP POLICY IF EXISTS "Doctors can manage own procedures" ON public.procedures;
DROP POLICY IF EXISTS "Doctors can manage procedures" ON public.procedures;
DROP POLICY IF EXISTS "doctor_manage_procedures" ON public.procedures;

CREATE POLICY "Doctors can manage own procedures"
ON public.procedures
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = public.procedures.dentist_id
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.id = public.procedures.dentist_id
      AND d.user_id = auth.uid()
  )
);
