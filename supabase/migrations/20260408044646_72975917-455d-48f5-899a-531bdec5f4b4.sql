
-- =====================================================
-- 1. FIX AVATARS STORAGE: Replace blanket SELECT with scoped policies
-- =====================================================

-- Drop the overly permissive blanket policy
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Allow public read for non-patient avatars (user profile photos)
CREATE POLICY "Public avatars are readable (non-patient)"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] != 'patients'
);

-- Patient photos only readable by their treating doctors (policy already exists but let's ensure)
-- The existing "Doctors can view photos of their patients" policy handles this

-- =====================================================
-- 2. FIX LAB/IMAGING STAFF INVITATION INSERT POLICIES
-- =====================================================

-- Fix lab_staff_invitations: require admin of the lab center
DROP POLICY IF EXISTS "Lab admins can invite staff" ON public.lab_staff_invitations;
DROP POLICY IF EXISTS "Admins can invite lab staff" ON public.lab_staff_invitations;

CREATE POLICY "Lab admins can invite staff"
ON public.lab_staff_invitations FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.lab_centers lc
    WHERE lc.id = lab_staff_invitations.lab_center_id
    AND lc.admin_id = auth.uid()
  )
);

-- Fix imaging_staff_invitations: require admin of the imaging center
DROP POLICY IF EXISTS "Imaging admins can invite staff" ON public.imaging_staff_invitations;
DROP POLICY IF EXISTS "Admins can invite imaging staff" ON public.imaging_staff_invitations;

CREATE POLICY "Imaging admins can invite staff"
ON public.imaging_staff_invitations FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.imaging_centers ic
    WHERE ic.id = imaging_staff_invitations.imaging_center_id
    AND ic.admin_id = auth.uid()
  )
);

-- =====================================================
-- 3. FIX profiles.role CHECKS IN RLS POLICIES
-- =====================================================

-- Replace bones policies that use profiles.role
DROP POLICY IF EXISTS "Admins can manage bones" ON public.bones;
CREATE POLICY "Admins can manage bones"
ON public.bones FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Replace doctor_verification_documents policies that use profiles.role
DROP POLICY IF EXISTS "Admins can view all verification documents" ON public.doctor_verification_documents;
CREATE POLICY "Admins can view all verification documents"
ON public.doctor_verification_documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================================================
-- 4. PREVENT PROFILE ROLE SELF-UPDATE via trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being changed and user is updating their own profile
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.user_id = auth.uid() THEN
    -- Only allow if caller is super_admin
    IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      NEW.role := OLD.role; -- silently revert
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_update_trigger ON public.profiles;
CREATE TRIGGER prevent_role_self_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_update();
