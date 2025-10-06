-- Update function to handle existing and new patients with email/phone matching
CREATE OR REPLACE FUNCTION public.create_or_get_patient_profile(
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
  v_profile profiles%ROWTYPE;
  v_is_doctor BOOLEAN;
BEGIN
  -- Verify caller is a doctor
  SELECT EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = auth.uid()
  ) INTO v_is_doctor;
  
  IF NOT v_is_doctor THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can create patient profiles');
  END IF;
  
  -- Priority 1: Find by email (most reliable)
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE lower(trim(email)) = lower(trim(p_email)) 
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', true, 
        'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile),
        'is_existing', true
      );
    END IF;
  END IF;
  
  -- Priority 2: Find by phone
  IF p_phone IS NOT NULL AND trim(p_phone) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE trim(phone) = trim(p_phone) 
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', true, 
        'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile),
        'is_existing', true
      );
    END IF;
  END IF;
  
  -- No existing patient found - create guest profile
  v_temp_user_id := gen_random_uuid();
  
  INSERT INTO profiles (user_id, full_name, email, phone, role)
  VALUES (v_temp_user_id, p_full_name, p_email, p_phone, 'patient')
  RETURNING * INTO v_profile;
  
  RETURN json_build_object(
    'success', true, 
    'user_id', v_profile.user_id,
    'profile', row_to_json(v_profile),
    'is_existing', false
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: profile just created, fetch it
    IF p_email IS NOT NULL THEN
      SELECT * INTO v_profile FROM profiles WHERE email = p_email AND role = 'patient' LIMIT 1;
    ELSIF p_phone IS NOT NULL THEN
      SELECT * INTO v_profile FROM profiles WHERE phone = p_phone AND role = 'patient' LIMIT 1;
    END IF;
    
    IF FOUND THEN
      RETURN json_build_object('success', true, 'user_id', v_profile.user_id, 'profile', row_to_json(v_profile), 'is_existing', true);
    END IF;
    
    RETURN json_build_object('success', false, 'error', 'Profile conflict');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create unified view for patient appointments (matches by auth user OR by email/phone)
CREATE OR REPLACE VIEW patient_all_appointments AS
SELECT DISTINCT a.*
FROM appointments a
INNER JOIN profiles p ON a.patient_id = p.user_id
WHERE 
  -- Logged in users see their own appointments
  (p.user_id = auth.uid())
  OR
  -- Also show appointments matched by email/phone (for guest bookings before signup)
  (
    EXISTS (
      SELECT 1 FROM profiles logged_in_user
      WHERE logged_in_user.user_id = auth.uid()
      AND logged_in_user.role = 'patient'
      AND (
        (logged_in_user.email IS NOT NULL AND p.email = logged_in_user.email)
        OR
        (logged_in_user.phone IS NOT NULL AND p.phone = logged_in_user.phone)
      )
    )
  );

-- Grant access to authenticated users
GRANT SELECT ON patient_all_appointments TO authenticated;