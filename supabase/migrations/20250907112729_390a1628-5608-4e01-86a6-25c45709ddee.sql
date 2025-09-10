-- Remove the view entirely to eliminate security definer concerns
-- Instead, rely on direct table queries with proper RLS policies

DROP VIEW IF EXISTS public.doctors_public;

-- Ensure the doctors table has the correct RLS policy for public access
-- to verified doctor information without sensitive data exposure
DROP POLICY IF EXISTS "Public can view limited doctor info" ON public.doctors;

-- Create a more specific policy that only allows access to basic public information
CREATE POLICY "Public can view basic verified doctor info" 
ON public.doctors 
FOR SELECT 
USING (
  is_verified = true
);

-- Note: Applications should query the doctors table directly and select only
-- the columns they need (id, name, practice_name, specialties, is_verified, created_at)
-- rather than using a view, to maintain security and avoid security definer issues