-- Fix security definer view issue
-- Drop and recreate public_practice_locations view with security_invoker

DROP VIEW IF EXISTS public.public_practice_locations;

CREATE VIEW public.public_practice_locations
WITH (security_invoker = true)
AS
SELECT 
  id, 
  practice_id, 
  name, 
  city, 
  state, 
  country, 
  is_primary
FROM practice_locations;

-- Grant public access to the view
GRANT SELECT ON public.public_practice_locations TO anon;
GRANT SELECT ON public.public_practice_locations TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.public_practice_locations IS 'Public view providing limited practice location information for booking purposes. Uses SECURITY INVOKER to respect RLS policies.';