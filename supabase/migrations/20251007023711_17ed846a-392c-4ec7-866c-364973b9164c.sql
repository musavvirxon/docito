-- Add unique constraints to profiles
ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Add verification fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Create SMS notifications table
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  phone VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on SMS notifications
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only doctors can create SMS notifications
CREATE POLICY "Doctors can create SMS notifications"
ON sms_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid())
);

-- Policy: Doctors can view SMS notifications
CREATE POLICY "Doctors can view SMS notifications"
ON sms_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = auth.uid())
);

-- Update create_or_get_patient_profile function
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
  v_profile profiles%ROWTYPE;
  v_is_doctor BOOLEAN;
  v_new_profile BOOLEAN := false;
BEGIN
  -- Verify caller is a doctor
  SELECT EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = auth.uid()
  ) INTO v_is_doctor;
  
  IF NOT v_is_doctor THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can manage patient profiles');
  END IF;
  
  -- Priority 1: Find by email (if provided)
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE lower(trim(email)) = lower(trim(p_email))
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      -- Update existing profile with new info if phone is different
      IF p_phone IS NOT NULL AND trim(p_phone) != '' AND v_profile.phone IS DISTINCT FROM p_phone THEN
        UPDATE profiles
        SET phone = p_phone, updated_at = NOW()
        WHERE user_id = v_profile.user_id;
        v_profile.phone := p_phone;
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile),
        'is_existing', true,
        'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- Priority 2: Find by phone (if provided and email not found)
  IF p_phone IS NOT NULL AND trim(p_phone) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE trim(phone) = trim(p_phone)
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      -- Update existing profile with new email if different
      IF p_email IS NOT NULL AND trim(p_email) != '' AND v_profile.email IS DISTINCT FROM p_email THEN
        UPDATE profiles
        SET email = p_email, updated_at = NOW()
        WHERE user_id = v_profile.user_id;
        v_profile.email := p_email;
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile),
        'is_existing', true,
        'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- No existing profile found - create new guest profile
  v_new_profile := true;
  
  INSERT INTO profiles (
    user_id, 
    full_name, 
    email, 
    phone, 
    role, 
    is_verified,
    verification_token,
    token_expires_at
  )
  VALUES (
    gen_random_uuid(),
    p_full_name,
    p_email,
    p_phone,
    'patient',
    false,
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '7 days'
  )
  RETURNING * INTO v_profile;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_profile.user_id,
    'profile', row_to_json(v_profile),
    'is_existing', false,
    'is_verified', false,
    'send_sms', true,
    'verification_token', v_profile.verification_token
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition or concurrent insert
    IF p_email IS NOT NULL THEN
      SELECT * INTO v_profile FROM profiles WHERE lower(trim(email)) = lower(trim(p_email)) AND role = 'patient' LIMIT 1;
    ELSIF p_phone IS NOT NULL THEN
      SELECT * INTO v_profile FROM profiles WHERE trim(phone) = trim(p_phone) AND role = 'patient' LIMIT 1;
    END IF;
    
    IF FOUND THEN
      RETURN json_build_object('success', true, 'user_id', v_profile.user_id, 'profile', row_to_json(v_profile), 'is_existing', true, 'is_verified', COALESCE(v_profile.is_verified, false));
    END IF;
    
    RETURN json_build_object('success', false, 'error', 'Profile already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to queue SMS
CREATE OR REPLACE FUNCTION public.send_patient_invitation_sms(
  p_patient_id UUID,
  p_phone VARCHAR,
  p_verification_token TEXT,
  p_doctor_name VARCHAR,
  p_appointment_date TIMESTAMPTZ
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification_link TEXT;
  v_message TEXT;
BEGIN
  -- Create verification link (update with actual domain)
  v_verification_link := 'https://yourdomain.com/verify/' || p_verification_token;
  
  -- Create SMS message
  v_message := 'Hi! Dr. ' || p_doctor_name || ' has scheduled an appointment for you on ' || 
               to_char(p_appointment_date, 'Mon DD, YYYY at HH:MI AM') || '. ' ||
               'Create your account to view details: ' || v_verification_link;
  
  -- Log the SMS (actual sending happens via Edge Function)
  INSERT INTO sms_notifications (patient_id, phone, message, status)
  VALUES (p_patient_id, p_phone, v_message, 'queued');
  
  RETURN json_build_object(
    'success', true,
    'message', 'SMS queued for delivery'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;