CREATE OR REPLACE FUNCTION public.generate_treatment_plan_verification_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := 'TP-' || encode(extensions.gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;