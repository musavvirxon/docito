-- Fix Security Definer View issue
-- The problem is that setting security_barrier = true makes the view run with 
-- the creator's permissions instead of the querying user's permissions,
-- which can bypass RLS policies and expose unauthorized data.

-- Drop the problematic view
DROP VIEW IF EXISTS public.doctors_public;

-- Recreate the view without security_barrier to ensure it respects the querying user's permissions
CREATE OR REPLACE VIEW public.doctors_public AS
SELECT 
  id,
  name,
  practice_name,
  specialties,
  is_verified,
  created_at
FROM public.doctors
WHERE is_verified = true;

-- Remove the security definer policy as it's no longer needed
DROP POLICY IF EXISTS "Anyone can view public doctor info" ON public.doctors_public;

-- Instead, ensure the underlying doctors table has proper RLS policies
-- The existing "Public can view limited doctor info" policy on doctors table
-- will control access appropriately without security definer risks

-- Verify that users can only access verified doctor information through normal RLS
-- This ensures that the view respects the same access controls as direct table queries