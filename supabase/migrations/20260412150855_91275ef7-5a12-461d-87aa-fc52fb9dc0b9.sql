
-- 1. Create security definer helpers to break recursion

-- Returns practice IDs where the user is admin
CREATE OR REPLACE FUNCTION public.get_admin_practice_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.practices WHERE admin_id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_practice_ids FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_practice_ids TO authenticated;

-- Returns practice IDs where the user is active staff
CREATE OR REPLACE FUNCTION public.get_staff_practice_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT practice_id FROM public.clinic_staff WHERE user_id = _user_id AND status = 'active';
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_practice_ids FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_practice_ids TO authenticated;

-- 2. Fix practices SELECT policy (was referencing profiles → recursion)
DROP POLICY IF EXISTS "Admins can view their own practice" ON public.practices;
CREATE POLICY "Admins can view their own practice"
ON public.practices FOR SELECT TO authenticated
USING (
  admin_id = auth.uid()
  OR id IN (SELECT public.get_staff_practice_ids(auth.uid()))
);

-- 3. Fix profiles policy (was referencing practices → recursion)
DROP POLICY IF EXISTS "Practice admins can view applicant profiles" ON public.profiles;
CREATE POLICY "Practice admins can view applicant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT d.user_id FROM public.doctors d
    JOIN public.practice_join_requests pjr ON pjr.doctor_id = d.id
    WHERE pjr.practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
  )
  OR
  user_id IN (
    SELECT d.user_id FROM public.doctors d
    JOIN public.practice_join_requests pjr ON pjr.doctor_id = d.id
    WHERE pjr.practice_id IN (SELECT public.get_staff_practice_ids(auth.uid()))
  )
);

-- 4. Fix clinic_staff policy (was referencing practices → which references profiles → recursion)
DROP POLICY IF EXISTS "Practice admins can manage their staff" ON public.clinic_staff;
CREATE POLICY "Practice admins can manage their staff"
ON public.clinic_staff FOR ALL TO authenticated
USING (
  practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
);

-- 5. Fix doctors policy (was referencing practices → recursion)
DROP POLICY IF EXISTS "Practice admins can view applicant doctors" ON public.doctors;
CREATE POLICY "Practice admins can view applicant doctors"
ON public.doctors FOR SELECT TO authenticated
USING (
  id IN (
    SELECT pjr.doctor_id FROM public.practice_join_requests pjr
    WHERE pjr.practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
  )
  OR
  id IN (
    SELECT pjr.doctor_id FROM public.practice_join_requests pjr
    WHERE pjr.practice_id IN (SELECT public.get_staff_practice_ids(auth.uid()))
  )
);

-- 6. Fix practice_join_requests policies (also referenced practices directly)
DROP POLICY IF EXISTS "Practice admins can view join requests" ON public.practice_join_requests;
CREATE POLICY "Practice admins can view join requests"
ON public.practice_join_requests FOR SELECT TO authenticated
USING (
  practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
  OR practice_id IN (SELECT public.get_staff_practice_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Practice admins can update join requests" ON public.practice_join_requests;
CREATE POLICY "Practice admins can update join requests"
ON public.practice_join_requests FOR UPDATE TO authenticated
USING (
  practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
  OR practice_id IN (SELECT public.get_staff_practice_ids(auth.uid()))
);
