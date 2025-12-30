-- =====================================================
-- Migration: Fix RBAC for Facility Admin Signup
-- This migration:
-- 1. Adds missing facility admin roles to app_role enum
-- 2. Updates handle_new_user() to properly insert roles
-- 3. Ensures profiles RLS allows users to insert their own profile
-- =====================================================

-- Add missing values to app_role enum if they don't exist
DO $$ 
BEGIN
  -- Add pharmacy_admin if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pharmacy_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'pharmacy_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lab_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'lab_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'imaging_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'imaging_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clinic_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'clinic_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recreate the handle_new_user function to properly handle all roles
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
  
  -- Insert the actual role into user_roles table
  -- Use a CASE to handle the role mapping to app_role enum
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
  
  -- Also add patient role for everyone (dual-role system)
  -- This ensures all users can also act as patients
  IF v_role_text != 'patient' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'patient'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create strict RLS policies for profiles
-- Users can insert their own profile (triggered by handle_new_user)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Super admins can view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Ensure RLS is enabled on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on user_roles if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert user roles" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Allow the handle_new_user trigger to insert roles (runs as SECURITY DEFINER)
-- This is handled by the SECURITY DEFINER on the function