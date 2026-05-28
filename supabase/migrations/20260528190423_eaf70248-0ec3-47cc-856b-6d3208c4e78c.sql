-- 1. Grants for clinic_services (missing — silent RLS failures)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_services TO authenticated;
GRANT ALL ON public.clinic_services TO service_role;

-- 2. Procedures: deposit + override price fields
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS provider_override_price numeric;

-- 3. Procedures: allow practice admins (owners) to manage procedures for doctors in their practice
DROP POLICY IF EXISTS "Practice admins manage procedures" ON public.procedures;
CREATE POLICY "Practice admins manage procedures"
ON public.procedures
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    JOIN public.practices p ON p.id = d.practice_id
    WHERE d.id = procedures.dentist_id
      AND p.admin_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    JOIN public.practices p ON p.id = d.practice_id
    WHERE d.id = procedures.dentist_id
      AND p.admin_id = auth.uid()
  )
);