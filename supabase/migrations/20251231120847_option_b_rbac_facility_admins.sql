-- =====================================================
-- Option B: RBAC + facility admin roles + strict RLS (publish-safe)
-- - Adds roles to app_role enum
-- - Updates handle_new_user() to store actual roles in user_roles
-- - Everyone also gets 'patient' role
-- - Profiles are insertable only by the owner; readable only by owner (and super_admin optional)
-- =====================================================

-- 1) Ensure app_role enum has required values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'patient' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'patient';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'doctor' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'doctor';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clinic_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'clinic_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pharmacy_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'pharmacy_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lab_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'lab_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'imaging_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'imaging_admin';
  END IF;

  -- Optional: super admin
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;


-- 2) (Optional but recommended) Ensure user_roles table exists with constraints
-- If your table already exists, this is harmless due to IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicates: a user should not get the same role twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND indexname = 'user_roles_user_id_role_key'
  ) THEN
    CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles(user_id, role);
  END IF;
END $$;


-- 3) Make sure profiles RLS is strict and insertable by owner
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies (safe if they don't exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read/update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;

-- Owner can SELECT own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Owner can UPDATE own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Owner can INSERT own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- (Optional) super_admin can view all profiles
-- Uncomment ONLY if you need it.
-- CREATE POLICY "Super admins can view all profiles"
-- ON public.profiles
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.user_roles ur
--     WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
--   )
-- );


-- 4) Lock down user_roles with RLS (read own roles only)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Do NOT allow client-side role inserts (roles should be written by trigger/admin tools)
-- (If you want admin UI later, add a controlled policy then.)


-- 5) Update handle_new_user() trigger to store real role + patient base role
-- IMPORTANT: This function runs as SECURITY DEFINER to bypass RLS safely for onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role app_role;
  v_profile_role text;
BEGIN
  -- Role from metadata, default patient
  v_role_text := COALESCE(new.raw_user_meta_data->>'role', 'patient');

  -- Cast into enum (fallback to patient if unknown)
  BEGIN
    v_role := v_role_text::app_role;
  EXCEPTION WHEN others THEN
    v_role := 'patient'::app_role;
  END;

  -- profiles.role in your app likely supports only: patient/doctor/admin/staff
  -- Map facility admins to 'admin' in profiles for compatibility.
  IF v_role IN ('clinic_admin','pharmacy_admin','lab_admin','imaging_admin','super_admin') THEN
    v_profile_role := 'admin';
  ELSIF v_role = 'doctor' THEN
    v_profile_role := 'doctor';
  ELSE
    v_profile_role := 'patient';
  END IF;

  -- Insert profile (id = auth uid)
  INSERT INTO public.profiles (id, user_id, full_name, email, role)
  VALUES (
    new.id,
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    v_profile_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Always grant requested role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Always grant patient access to everyone (your requirement)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'patient'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
