
-- Fix search_path for the verification code function
CREATE OR REPLACE FUNCTION public.generate_treatment_plan_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := 'TP-' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$;
