-- Fix the set_updated_at trigger function to handle tables with updated_at column properly
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set updated_at if the column exists on the table
  IF TG_TABLE_NAME IN ('doctors', 'profiles', 'practices', 'appointments', 'doctor_verification', 'doctor_verification_documents') THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;