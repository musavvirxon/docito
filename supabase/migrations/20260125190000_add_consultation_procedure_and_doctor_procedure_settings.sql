ALTER TABLE public.procedures
ADD COLUMN IF NOT EXISTS is_consultation BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure only one consultation procedure per doctor
CREATE UNIQUE INDEX IF NOT EXISTS procedures_one_consultation_per_doctor
  ON public.procedures (dentist_id)
  WHERE is_consultation = TRUE;

-- Helpful lookup index
CREATE INDEX IF NOT EXISTS procedures_consultation_lookup
  ON public.procedures (dentist_id, is_consultation);

-- 2) Auto-create / sync consultation procedure when doctor becomes verified and has a consultation fee
CREATE OR REPLACE FUNCTION public.ensure_consultation_procedure_for_doctor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_fee NUMERIC;
BEGIN
  -- Only run when verified and fee set
  IF NEW.verified IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  v_fee := NEW.consultation_fee;
  IF v_fee IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.procedures p
    WHERE p.dentist_id = NEW.id
      AND p.is_consultation = TRUE
    LIMIT 1
  ) INTO v_exists;

  IF NOT v_exists THEN
    -- Create a default consultation procedure
    INSERT INTO public.procedures (
      dentist_id,
      name,
      category,
      type,
      default_cost,
      price,
      duration_minutes,
      is_active,
      is_bookable,
      is_consultation,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'Consultation',
      'general',
      'single_visit',
      v_fee,
      v_fee,
      30,
      TRUE,
      TRUE,
      TRUE,
      NOW(),
      NOW()
    );
  ELSE
    -- Keep consultation procedure price in sync with consultation_fee
    UPDATE public.procedures
    SET
      price = COALESCE(price, v_fee),
      default_cost = COALESCE(default_cost, v_fee),
      updated_at = NOW()
    WHERE dentist_id = NEW.id
      AND is_consultation = TRUE
      AND (price IS DISTINCT FROM v_fee OR default_cost IS DISTINCT FROM v_fee);
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger
DROP TRIGGER IF EXISTS trg_ensure_consultation_procedure_for_doctor ON public.doctors;
CREATE TRIGGER trg_ensure_consultation_procedure_for_doctor
AFTER INSERT OR UPDATE OF verified, consultation_fee
ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.ensure_consultation_procedure_for_doctor();

-- 4) Backfill existing verified doctors with fees
INSERT INTO public.procedures (
  dentist_id,
  name,
  category,
  type,
  default_cost,
  price,
  duration_minutes,
  is_active,
  is_bookable,
  is_consultation,
  created_at,
  updated_at
)
SELECT
  d.id,
  'Consultation',
  'general',
  'single_visit',
  d.consultation_fee,
  d.consultation_fee,
  30,
  TRUE,
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM public.doctors d
WHERE d.verified = TRUE
  AND d.consultation_fee IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.procedures p
    WHERE p.dentist_id = d.id
      AND p.is_consultation = TRUE
  );
