-- Fix infinite recursion between doctors <-> practice_join_requests RLS policies.
-- Use a SECURITY DEFINER helper to test "is this doctor an applicant to a practice I admin?"
-- without re-triggering doctors RLS.

CREATE OR REPLACE FUNCTION public.is_doctor_applicant_for_user(_doctor_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_join_requests pjr
    WHERE pjr.doctor_id = _doctor_id
      AND (
        pjr.practice_id IN (SELECT public.get_admin_practice_ids(_user_id))
        OR pjr.practice_id IN (SELECT public.get_staff_practice_ids(_user_id))
      )
  )
$$;

DROP POLICY IF EXISTS "Practice admins can view applicant doctors" ON public.doctors;

CREATE POLICY "Practice admins can view applicant doctors"
ON public.doctors
FOR SELECT
USING (public.is_doctor_applicant_for_user(id, auth.uid()));