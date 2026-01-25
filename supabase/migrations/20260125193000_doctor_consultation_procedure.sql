BEGIN;

-- 1) Procedures: add is_consultation flag (idempotent)
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS is_consultation boolean NOT NULL DEFAULT false;

-- 2) Ensure only one consultation procedure per doctor (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS procedures_one_consultation_per_doctor_idx
  ON public.procedures (dentist_id)
  WHERE is_consultation;

-- 3) Helper function to create the consultation procedure if eligible and missing (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_consultation_procedure(p_doctor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee numeric;
  v_verified boolean;
BEGIN
  SELECT consultation_fee, verified
    INTO v_fee, v_verified
  FROM public.doctors
  WHERE id = p_doctor_id;

  IF v_verified IS DISTINCT FROM true THEN
    RETURN;
  END IF;

  IF v_fee IS NULL THEN
    RETURN;
  END IF;

  -- Insert only if missing (enforced by partial unique index as well)
  INSERT INTO public.procedures (
    dentist_id,
    name,
    category,
    type,
    default_cost,
    price,
    is_bookable,
    is_active,
    is_consultation,
    notes
  )
  SELECT
    p_doctor_id,
    'Consultation',
    'general_consultation',
    'single_visit',
    v_fee,
    v_fee,
    true,
    true,
    true,
    'Auto-created from doctor verification/consultation fee'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.procedures p
    WHERE p.dentist_id = p_doctor_id
      AND p.is_consultation = true
      AND p.is_active = true
  );

  -- Keep the existing consultation procedure in sync with doctor fee
  UPDATE public.procedures
  SET default_cost = v_fee,
      price = v_fee
  WHERE dentist_id = p_doctor_id
    AND is_consultation = true
    AND is_active = true;
END;
$$;

-- 4) Trigger: on doctors insert/update verified/fee, ensure consultation procedure exists
CREATE OR REPLACE FUNCTION public.doctor_after_verify_ensure_consultation_procedure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.ensure_consultation_procedure(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_ensure_consultation_procedure ON public.doctors;

CREATE TRIGGER trg_doctor_ensure_consultation_procedure
AFTER INSERT OR UPDATE OF verified, consultation_fee ON public.doctors
FOR EACH ROW
WHEN (NEW.verified IS TRUE AND NEW.consultation_fee IS NOT NULL)
EXECUTE FUNCTION public.doctor_after_verify_ensure_consultation_procedure();

COMMIT;
