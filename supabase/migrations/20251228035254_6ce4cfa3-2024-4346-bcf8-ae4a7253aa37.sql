-- Fix infinite recursion in profiles table RLS policies
-- The issue is that policies query the profiles table recursively

-- Drop the problematic policies
DROP POLICY IF EXISTS "Doctors can view patient profiles with recent appointments" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view patient profiles for their practice" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile or doctors can create patients" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create helper function to check if user is doctor with patient appointment (avoids recursion)
CREATE OR REPLACE FUNCTION public.doctor_can_view_patient_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = target_user_id
      AND d.user_id = auth.uid()
      AND a.appointment_date >= (CURRENT_DATE - INTERVAL '1 year')
  )
$$;

-- Create helper function to check if staff can view patient profile (avoids recursion)
CREATE OR REPLACE FUNCTION public.staff_can_view_patient_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM clinic_staff cs
    JOIN appointments a ON a.practice_id = cs.practice_id
    WHERE cs.user_id = auth.uid()
      AND a.patient_id = target_user_id
      AND cs.status = 'active'
  )
$$;

-- Recreate policies using helper functions (no recursion)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient profiles with recent appointments"
ON public.profiles
FOR SELECT
USING (public.doctor_can_view_patient_profile(user_id));

CREATE POLICY "Staff can view patient profiles for their practice"
ON public.profiles
FOR SELECT
USING (public.staff_can_view_patient_profile(user_id));

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Also update the signup flow to add both patient role and specified role
-- Create function to add user roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'patient');
  
  -- Always add patient role (everyone can be a patient)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'patient'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add the specific role if different from patient
  IF user_role != 'patient' AND user_role IS NOT NULL THEN
    -- Validate the role is in our enum
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (new.id, user_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Invalid role, ignore it
      NULL;
    END;
  END IF;
  
  RETURN new;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_roles();