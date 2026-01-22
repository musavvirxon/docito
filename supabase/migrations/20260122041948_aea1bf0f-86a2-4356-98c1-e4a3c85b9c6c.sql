-- Fix update_updated_at_column to not crash on tables without updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  BEGIN
    NEW.updated_at = now();
  EXCEPTION
    WHEN undefined_column THEN
      -- Table doesn't have updated_at
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;