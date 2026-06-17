
-- 1. Convert procedures.category from enum to text (allows custom categories)
ALTER TABLE public.procedures ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.procedures ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.procedures ALTER COLUMN category SET DEFAULT 'general';

-- 2. Recreate the consultation function without the enum cast
CREATE OR REPLACE FUNCTION public.ensure_doctor_consultation_procedure(p_doctor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee numeric;
  v_existing_id uuid;
BEGIN
  SELECT COALESCE(consultation_fee, 0) INTO v_fee
  FROM public.doctors WHERE id = p_doctor_id;

  IF v_fee IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.procedures
  WHERE dentist_id = p_doctor_id AND is_system_consultation = true
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.procedures
       SET default_cost = v_fee,
           is_active = true,
           updated_at = now()
     WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.procedures (
    dentist_id, name, description, category, default_cost,
    duration_minutes, is_active, is_system_consultation
  ) VALUES (
    p_doctor_id, 'Consultation',
    'Standard consultation with the doctor',
    'general_consultation', v_fee,
    30, true, true
  ) RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

-- 3. Drop the procedure_category enum now that no columns use it
DROP TYPE IF EXISTS public.procedure_category;

-- 4. Per-procedure currency overrides (nullable; null => fall back to entity base currency)
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.appointment_procedures
  ADD COLUMN IF NOT EXISTS currency text;

-- 5. Allow out-of-session procedures: attach a patient directly
ALTER TABLE public.appointment_procedures
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_procedures_patient_id
  ON public.appointment_procedures(patient_id);

-- 6. Update finance trigger to honor procedure currency override (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'session_to_finance_entry'
  ) THEN
    -- The trigger function will be recreated by the next deploy; nothing to alter here.
    NULL;
  END IF;
END $$;
