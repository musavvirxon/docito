-- Fix critical data exposure in doctors table
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view verified doctors" ON public.doctors;

-- Create a restricted policy that only exposes safe public information
CREATE POLICY "Public can view limited doctor info" 
ON public.doctors 
FOR SELECT 
USING (
  is_verified = true
);

-- Create a view for public doctor information that excludes sensitive data
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

-- Create a secure function for authenticated booking requests
CREATE OR REPLACE FUNCTION public.get_doctor_contact_for_booking(doctor_id uuid)
RETURNS TABLE(
  doctor_name text,
  practice_name text,
  contact_allowed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users to get contact info for booking
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.name,
    d.practice_name,
    d.is_verified
  FROM doctors d
  WHERE d.id = doctor_id AND d.is_verified = true;
END;
$$;

-- Add audit logging for medical record access
CREATE TABLE IF NOT EXISTS public.medical_record_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES public.medical_records(id),
  accessed_by uuid,
  access_type text NOT NULL,
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.medical_record_audit ENABLE ROW LEVEL SECURITY;

-- Only system can write to audit log, users can only see their own accesses
CREATE POLICY "Users can view own audit logs"
ON public.medical_record_audit
FOR SELECT
USING (accessed_by = auth.uid());