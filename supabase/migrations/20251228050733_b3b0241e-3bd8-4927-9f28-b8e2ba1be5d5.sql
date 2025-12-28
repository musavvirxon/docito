-- Fix gen_random_bytes error by enabling pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the create_or_get_patient_profile function with proper extension
CREATE OR REPLACE FUNCTION public.create_or_get_patient_profile(p_full_name character varying, p_email character varying, p_phone character varying DEFAULT NULL::character varying)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_profile profiles%ROWTYPE;
  v_is_doctor BOOLEAN;
  v_new_profile BOOLEAN := false;
  v_temp_user_id UUID;
BEGIN
  -- Authorization: only doctors can create patient profiles
  IF NOT public.has_role(auth.uid(), 'doctor') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only doctors can create patient profiles');
  END IF;
  
  -- Find by email
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE lower(trim(email)) = lower(trim(p_email))
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      IF p_phone IS NOT NULL AND trim(p_phone) != '' AND v_profile.phone IS DISTINCT FROM p_phone THEN
        UPDATE profiles SET phone = p_phone, updated_at = NOW() WHERE user_id = v_profile.user_id;
        v_profile.phone := p_phone;
      END IF;
      
      RETURN json_build_object(
        'success', true, 'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile), 'is_existing', true, 'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- Find by phone
  IF p_phone IS NOT NULL AND trim(p_phone) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE trim(phone) = trim(p_phone) AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      IF p_email IS NOT NULL AND trim(p_email) != '' AND v_profile.email IS DISTINCT FROM p_email THEN
        UPDATE profiles SET email = p_email, updated_at = NOW() WHERE user_id = v_profile.user_id;
        v_profile.email := p_email;
      END IF;
      
      RETURN json_build_object(
        'success', true, 'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile), 'is_existing', true, 'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- Create new guest profile using extensions schema for gen_random_uuid
  v_temp_user_id := extensions.gen_random_uuid();
  
  INSERT INTO profiles (user_id, full_name, email, phone, role, is_verified, verification_token, token_expires_at)
  VALUES (
    v_temp_user_id, p_full_name, p_email, p_phone, 'patient',
    false, encode(extensions.gen_random_bytes(32), 'hex'), NOW() + INTERVAL '7 days'
  )
  RETURNING * INTO v_profile;
  
  -- Add patient role to user_roles
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (v_profile.user_id, 'patient', auth.uid())
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object(
    'success', true, 'user_id', v_profile.user_id,
    'profile', row_to_json(v_profile), 'is_existing', false, 'is_verified', false,
    'send_sms', true, 'verification_token', v_profile.verification_token
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Also fix create_guest_patient_profile function
CREATE OR REPLACE FUNCTION public.create_guest_patient_profile(p_full_name character varying, p_email character varying, p_phone character varying DEFAULT NULL::character varying)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_temp_user_id UUID;
  v_new_profile profiles%ROWTYPE;
  v_existing_profile profiles%ROWTYPE;
  v_is_doctor BOOLEAN;
BEGIN
  -- Check if the current user is a doctor
  SELECT EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = auth.uid()
  ) INTO v_is_doctor;
  
  IF NOT v_is_doctor THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can create guest patient profiles');
  END IF;
  
  -- Check if a patient with this email already exists
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT * INTO v_existing_profile 
    FROM profiles 
    WHERE email = p_email AND role = 'patient';
    
    IF FOUND THEN
      -- Return existing patient profile
      RETURN json_build_object(
        'success', true, 
        'user_id', v_existing_profile.user_id,
        'profile', row_to_json(v_existing_profile),
        'existing', true
      );
    END IF;
  END IF;
  
  -- Generate a new UUID for the guest patient using extensions schema
  v_temp_user_id := extensions.gen_random_uuid();
  
  -- Insert the guest patient profile
  INSERT INTO profiles (user_id, full_name, email, phone, role)
  VALUES (v_temp_user_id, p_full_name, p_email, p_phone, 'patient')
  RETURNING * INTO v_new_profile;
  
  RETURN json_build_object(
    'success', true, 
    'user_id', v_new_profile.user_id,
    'profile', row_to_json(v_new_profile),
    'existing', false
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;