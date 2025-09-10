-- Fix Security Definer Function issue
-- Convert the get_doctor_contact_for_booking function from SECURITY DEFINER to SECURITY INVOKER
-- This ensures the function runs with the permissions of the calling user, not the function creator

-- Drop the existing security definer function
DROP FUNCTION IF EXISTS public.get_doctor_contact_for_booking(uuid);

-- Recreate as a security invoker function with proper access control
CREATE OR REPLACE FUNCTION public.get_doctor_contact_for_booking(doctor_id uuid)
RETURNS TABLE(
  doctor_name text,
  practice_name text,
  contact_allowed boolean
)
LANGUAGE plpgsql
SECURITY INVOKER  -- This ensures the function respects the calling user's permissions
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users to get contact info for booking
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Return limited information using the same permissions as the calling user
  -- This will respect RLS policies on the doctors table
  RETURN QUERY
  SELECT 
    d.name,
    d.practice_name,
    d.is_verified
  FROM doctors d
  WHERE d.id = doctor_id 
    AND d.is_verified = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_doctor_contact_for_booking(uuid) TO authenticated;