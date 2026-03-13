
-- Add verification_code column to treatment_plans
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS verification_code text;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_treatment_plans_verification_code
  ON public.treatment_plans (verification_code)
  WHERE verification_code IS NOT NULL;

-- Auto-generate verification_code for new rows using a trigger
CREATE OR REPLACE FUNCTION public.generate_treatment_plan_verification_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := 'TP-' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_treatment_plan_verification_code ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plan_verification_code
  BEFORE INSERT ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_treatment_plan_verification_code();

-- Backfill existing rows that have no verification_code
UPDATE public.treatment_plans
  SET verification_code = 'TP-' || encode(gen_random_bytes(8), 'hex')
  WHERE verification_code IS NULL;
