-- Fix security issue: Set search_path for update_blocked_times_updated_at function
CREATE OR REPLACE FUNCTION update_blocked_times_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;