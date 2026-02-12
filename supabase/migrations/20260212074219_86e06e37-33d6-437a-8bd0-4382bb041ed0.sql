
-- Update handle_new_user() to always also insert 'patient' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _full_name text;
  _email text;
  _profile_role text;
BEGIN
  _email := COALESCE(new.email, '');
  _full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'fullName',
    split_part(_email, '@', 1)
  );
  _role := COALESCE(new.raw_user_meta_data->>'role', 'patient');

  -- Map to profile role column (legacy)
  IF _role IN ('admin', 'clinic_admin', 'pharmacy_admin', 'lab_admin', 'imaging_admin', 'super_admin') THEN
    _profile_role := 'admin';
  ELSIF _role = 'doctor' THEN
    _profile_role := 'doctor';
  ELSIF _role = 'staff' THEN
    _profile_role := 'staff';
  ELSE
    _profile_role := 'patient';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (new.id, _email, _full_name, _profile_role)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);

  -- Insert the chosen signup role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Always also ensure patient role exists
  IF _role <> 'patient' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'patient'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Backfill: ensure every existing user has a patient role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, 'patient'::app_role
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles pr
  WHERE pr.user_id = ur.user_id AND pr.role = 'patient'
)
ON CONFLICT (user_id, role) DO NOTHING;
