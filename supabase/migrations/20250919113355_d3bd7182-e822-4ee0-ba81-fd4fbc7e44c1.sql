-- Fix consent_forms security vulnerabilities
-- Remove overly permissive policies and replace with secure ones

-- Drop the existing insecure policies
DROP POLICY IF EXISTS "Anyone can insert consent forms" ON consent_forms;
DROP POLICY IF EXISTS "Anyone can update consent forms" ON consent_forms;

-- Create secure INSERT policy: Only doctors can create consent forms for their treatment plans
CREATE POLICY "Doctors can create consent forms for their treatment plans"
ON consent_forms
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treatment_plans tp
    JOIN doctors d ON d.id = tp.doctor_id
    WHERE tp.id = consent_forms.treatment_plan_id 
    AND d.user_id = auth.uid()
  )
);

-- Create secure UPDATE policy: Only patients can sign their own consent forms
CREATE POLICY "Patients can sign their own consent forms"
ON consent_forms  
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treatment_plans tp
    WHERE tp.id = consent_forms.treatment_plan_id
    AND tp.patient_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treatment_plans tp
    WHERE tp.id = consent_forms.treatment_plan_id
    AND tp.patient_id = auth.uid()
  )
);

-- Allow doctors to update consent forms they created (for form content updates)
CREATE POLICY "Doctors can update their own consent forms"
ON consent_forms
FOR UPDATE  
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treatment_plans tp
    JOIN doctors d ON d.id = tp.doctor_id
    WHERE tp.id = consent_forms.treatment_plan_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treatment_plans tp
    JOIN doctors d ON d.id = tp.doctor_id  
    WHERE tp.id = consent_forms.treatment_plan_id
    AND d.user_id = auth.uid()
  )
);

-- Update the sign_informed_consent function to use proper authentication
CREATE OR REPLACE FUNCTION public.sign_informed_consent(
  consent_form_id uuid, 
  patient_full_name character varying, 
  digital_signature text DEFAULT NULL::text, 
  patient_signature text DEFAULT NULL::text, 
  ip_address inet DEFAULT NULL::inet
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $function$
BEGIN
  -- Verify the current user is the patient for this consent form
  IF NOT EXISTS (
    SELECT 1 FROM consent_forms cf
    JOIN treatment_plans tp ON tp.id = cf.treatment_plan_id
    WHERE cf.id = consent_form_id 
    AND tp.patient_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Unauthorized: You can only sign your own consent forms'
    );
  END IF;

  -- Update the consent form
  UPDATE consent_forms SET
    status = 'signed',
    patient_full_name = sign_informed_consent.patient_full_name,
    digital_signature = sign_informed_consent.digital_signature,
    patient_signature = sign_informed_consent.patient_signature,
    ip_address = sign_informed_consent.ip_address,
    signed_at = NOW()
  WHERE id = consent_form_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Consent form not found');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Consent form signed successfully');
END;
$function$;