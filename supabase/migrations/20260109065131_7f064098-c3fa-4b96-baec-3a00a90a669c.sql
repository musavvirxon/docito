-- ============================================================
-- Add doctor_id to profiles for denormalized access
-- Auto-create doctor row when user becomes a doctor
-- ============================================================

-- 1. Add doctor_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_id ON public.profiles(doctor_id);

-- 2. Function to auto-create doctor and link to profile
CREATE OR REPLACE FUNCTION public.ensure_doctor_row_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
BEGIN
  -- Only process if role is 'doctor' and doctor_id is not set
  IF NEW.role = 'doctor' AND NEW.doctor_id IS NULL THEN
    -- Check if doctor already exists for this user
    SELECT id INTO v_doctor_id
    FROM public.doctors
    WHERE user_id = NEW.user_id;
    
    -- If no doctor row exists, create one
    IF v_doctor_id IS NULL THEN
      INSERT INTO public.doctors (user_id, specialty, verified, accepts_new_patients)
      VALUES (NEW.user_id, 'General Practice', false, true)
      RETURNING id INTO v_doctor_id;
    END IF;
    
    -- Set doctor_id on the profile
    NEW.doctor_id := v_doctor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Trigger on INSERT to profiles
DROP TRIGGER IF EXISTS tr_ensure_doctor_on_profile_insert ON public.profiles;
CREATE TRIGGER tr_ensure_doctor_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_doctor_row_for_profile();

-- 4. Trigger on UPDATE to profiles (when role changes to doctor)
DROP TRIGGER IF EXISTS tr_ensure_doctor_on_profile_update ON public.profiles;
CREATE TRIGGER tr_ensure_doctor_on_profile_update
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'doctor' AND (OLD.role IS DISTINCT FROM 'doctor' OR NEW.doctor_id IS NULL))
  EXECUTE FUNCTION public.ensure_doctor_row_for_profile();

-- 5. Backfill: Create missing doctor rows and set doctor_id for existing doctor users
DO $$
DECLARE
  r RECORD;
  v_doctor_id UUID;
BEGIN
  FOR r IN 
    SELECT p.user_id, p.id as profile_id
    FROM public.profiles p
    WHERE p.role = 'doctor'
    AND p.doctor_id IS NULL
  LOOP
    -- Check if doctor exists
    SELECT id INTO v_doctor_id
    FROM public.doctors
    WHERE user_id = r.user_id;
    
    -- Create doctor if missing
    IF v_doctor_id IS NULL THEN
      INSERT INTO public.doctors (user_id, specialty, verified, accepts_new_patients)
      VALUES (r.user_id, 'General Practice', false, true)
      RETURNING id INTO v_doctor_id;
    END IF;
    
    -- Update profile with doctor_id
    UPDATE public.profiles
    SET doctor_id = v_doctor_id
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;