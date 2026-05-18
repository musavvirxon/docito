
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
    'general_consultation'::procedure_category, v_fee,
    30, true, true
  ) RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

-- Re-run schema additions idempotently (in case previous migration partially applied)
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS is_system_consultation boolean NOT NULL DEFAULT false;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL;

ALTER TABLE public.payments ALTER COLUMN practice_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_practice_or_doctor_required'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_practice_or_doctor_required
      CHECK (practice_id IS NOT NULL OR doctor_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_doctor_id ON public.payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);

DROP POLICY IF EXISTS "Doctors can view their payments" ON public.payments;
CREATE POLICY "Doctors can view their payments"
ON public.payments FOR SELECT
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can insert their payments" ON public.payments;
CREATE POLICY "Doctors can insert their payments"
ON public.payments FOR INSERT
WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Doctors can update their payments" ON public.payments;
CREATE POLICY "Doctors can update their payments"
ON public.payments FOR UPDATE
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

GRANT EXECUTE ON FUNCTION public.ensure_doctor_consultation_procedure(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_doctor_consultation_procedure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_doctor_consultation_procedure(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_doctor_consultation_procedure ON public.doctors;
CREATE TRIGGER trg_sync_doctor_consultation_procedure
AFTER INSERT OR UPDATE OF consultation_fee ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.sync_doctor_consultation_procedure();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.doctors LOOP
    PERFORM public.ensure_doctor_consultation_procedure(r.id);
  END LOOP;
END $$;
