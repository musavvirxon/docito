-- supabase/migrations/20260203094500_default_marketing_opt_in_on_signup.sql
-- Idempotent: update handle_new_user() to persist marketing email opt-in into profiles.privacy_settings
-- Reads raw_user_meta_data.marketing_communications (boolean) from auth signup options.data

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_role_text text;
  v_profile_role user_role;
  v_marketing_opt_in boolean := false;
  v_privacy_settings jsonb;
BEGIN
  -- Extract role from metadata, default to 'patient'
  v_role_text := COALESCE(new.raw_user_meta_data->>'role', 'patient');

  -- Marketing opt-in from metadata (safe cast)
  IF (new.raw_user_meta_data ? 'marketing_communications') THEN
    BEGIN
      v_marketing_opt_in := (new.raw_user_meta_data->>'marketing_communications')::boolean;
    EXCEPTION WHEN others THEN
      v_marketing_opt_in := false;
    END;
  END IF;

  v_privacy_settings := jsonb_build_object(
    'profileVisibility', true,
    'shareAnalytics', true,
    'marketingCommunications', v_marketing_opt_in
  );

  -- Map facility admin roles to 'admin' for profiles.role (backward compatibility)
  -- The actual role is stored in user_roles table
  v_profile_role := CASE
    WHEN v_role_text IN ('pharmacy_admin', 'lab_admin', 'imaging_admin', 'clinic_admin', 'super_admin', 'admin') THEN 'admin'::user_role
    WHEN v_role_text = 'doctor' THEN 'doctor'::user_role
    WHEN v_role_text = 'staff' THEN 'staff'::user_role
    ELSE 'patient'::user_role
  END;

  -- Insert profile with mapped role + privacy settings
  INSERT INTO public.profiles (user_id, full_name, email, role, privacy_settings)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_profile_role,
    v_privacy_settings
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

  RETURN new;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
