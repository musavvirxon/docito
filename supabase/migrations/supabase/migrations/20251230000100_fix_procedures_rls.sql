-- 1) Fix any existing procedures where dentist_id accidentally stored doctors.user_id (auth uid)
-- Map procedures.dentist_id (auth uid) -> doctors.id
UPDATE public.procedures p
SET dentist_id = d.id
FROM public.doctors d
WHERE p.dentist_id = d.user_id;

-- 2) Recreate RLS policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Doctors can manage own procedures" ON public.procedures;

CREATE POLICY "Doctors can manage own procedures"
ON public.procedures
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors
    WHERE doctors.id = procedures.dentist_id
      AND doctors.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.doctors
    WHERE doctors.id = procedures.dentist_id
      AND doctors.user_id = auth.uid()
  )
);
