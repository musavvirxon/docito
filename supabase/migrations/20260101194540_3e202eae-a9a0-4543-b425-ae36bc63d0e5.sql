-- =====================================================
-- Migration: Fix RBAC - Remove Auto-Assign Patient Role
-- Per user request: users signup with ONE primary role only
-- Additional roles are added post-signup via onboarding
-- =====================================================

-- Recreate the handle_new_user function to NOT auto-assign patient role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_role_text text;
  v_profile_role user_role;
BEGIN
  -- Extract role from metadata, default to 'patient'
  v_role_text := COALESCE(new.raw_user_meta_data->>'role', 'patient');
  
  -- Map facility admin roles to 'admin' for profiles.role (backward compatibility)
  -- The actual role is stored in user_roles table
  v_profile_role := CASE 
    WHEN v_role_text IN ('pharmacy_admin', 'lab_admin', 'imaging_admin', 'clinic_admin', 'super_admin', 'admin') THEN 'admin'::user_role
    WHEN v_role_text = 'doctor' THEN 'doctor'::user_role
    WHEN v_role_text = 'staff' THEN 'staff'::user_role
    ELSE 'patient'::user_role
  END;
  
  -- Insert profile with mapped role
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_profile_role
  );
  
  -- Insert ONLY the signup role into user_roles table
  -- DO NOT auto-assign patient role to everyone
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, v_role_text::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN invalid_text_representation THEN
    -- If the role is not a valid app_role, default to patient
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'patient'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END;
  
  -- NO LONGER auto-adding patient role for everyone
  -- Additional roles can only be added post-signup via proper onboarding
  
  RETURN new;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();