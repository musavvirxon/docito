-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'admin', 'super_admin', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Grant super_admin role to the 3 authorized emails
-- This will be done via a function that checks and inserts if the user exists
CREATE OR REPLACE FUNCTION public.grant_super_admin_to_authorized_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authorized_emails text[] := ARRAY[
    'musavvirxonabduvoxidov@gmail.com',
    'musavvirxon.abduvoxidov04@gmail.com',
    'musavvirxon.abduvoxidov04@outlook.com'
  ];
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email FROM auth.users 
    WHERE email = ANY(authorized_emails)
  LOOP
    -- Insert super_admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END;
$$;

-- Execute the function to grant roles to existing users
SELECT public.grant_super_admin_to_authorized_emails();

-- Create a trigger to automatically grant super_admin role when authorized users sign up
CREATE OR REPLACE FUNCTION public.handle_new_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authorized_emails text[] := ARRAY[
    'musavvirxonabduvoxidov@gmail.com',
    'musavvirxon.abduvoxidov04@gmail.com',
    'musavvirxon.abduvoxidov04@outlook.com'
  ];
BEGIN
  IF NEW.email = ANY(authorized_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_super_admin();