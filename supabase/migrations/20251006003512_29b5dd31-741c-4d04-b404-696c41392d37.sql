-- Update the create_guest_patient_profile function to handle existing patients
CREATE OR REPLACE FUNCTION public.create_guest_patient_profile(
  p_full_name VARCHAR,
  p_email VARCHAR,
  p_phone VARCHAR DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Generate a new UUID for the guest patient
  v_temp_user_id := gen_random_uuid();
  
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
$$;