-- Fix trigger helper to never error on tables without updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  BEGIN
    NEW.updated_at := now();
  EXCEPTION
    WHEN undefined_column THEN
      -- Table doesn't have updated_at; do nothing
      NULL;
  END;

  RETURN NEW;
END;
$$;