-- Drop the old AFTER trigger if it exists
DROP TRIGGER IF EXISTS merge_guest_profile_trigger ON profiles;
DROP FUNCTION IF EXISTS merge_guest_profile_on_signup();

-- Create new BEFORE INSERT trigger function
CREATE OR REPLACE FUNCTION public.handle_profile_signup_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_profile profiles%ROWTYPE;
BEGIN
  -- Only run for patient role
  IF NEW.role != 'patient' THEN
    RETURN NEW;
  END IF;
  
  -- Look for existing profile with same email
  SELECT * INTO v_guest_profile
  FROM profiles
  WHERE email = NEW.email
  AND role = 'patient'
  AND user_id != NEW.user_id
  LIMIT 1;
  
  -- If guest profile exists, merge it
  IF FOUND THEN
    -- Transfer all appointments to the new user_id
    UPDATE appointments
    SET patient_id = NEW.user_id
    WHERE patient_id = v_guest_profile.user_id;
    
    -- Transfer medical records
    UPDATE medical_records
    SET patient_id = NEW.user_id
    WHERE patient_id = v_guest_profile.user_id;
    
    -- Transfer treatment plans
    UPDATE treatment_plans
    SET patient_id = NEW.user_id
    WHERE patient_id = v_guest_profile.user_id;
    
    -- Update the existing profile instead of creating new one
    UPDATE profiles
    SET 
      user_id = NEW.user_id,
      phone = COALESCE(NEW.phone, phone),
      full_name = COALESCE(NEW.full_name, full_name),
      updated_at = NOW()
    WHERE user_id = v_guest_profile.user_id;
    
    -- Return NULL to prevent the INSERT (we updated instead)
    RETURN NULL;
  END IF;
  
  -- No conflict, allow normal insert
  RETURN NEW;
END;
$$;

-- Create BEFORE INSERT trigger
CREATE TRIGGER handle_profile_signup_conflict_trigger
BEFORE INSERT ON profiles
FOR EACH ROW
WHEN (NEW.role = 'patient')
EXECUTE FUNCTION handle_profile_signup_conflict();