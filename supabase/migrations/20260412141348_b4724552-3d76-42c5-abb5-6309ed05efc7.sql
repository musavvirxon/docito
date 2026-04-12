-- Allow practice admins/staff to view doctor records for applicants
CREATE POLICY "Practice admins can view applicant doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT doctor_id FROM public.practice_join_requests
    WHERE practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  )
  OR
  id IN (
    SELECT doctor_id FROM public.practice_join_requests pjr
    WHERE EXISTS (
      SELECT 1 FROM public.clinic_staff cs
      WHERE cs.practice_id = pjr.practice_id
        AND cs.user_id = auth.uid()
        AND cs.status = 'active'
    )
  )
);

-- Allow practice admins/staff to view profiles of applicant doctors
CREATE POLICY "Practice admins can view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT d.user_id FROM public.doctors d
    JOIN public.practice_join_requests pjr ON pjr.doctor_id = d.id
    WHERE pjr.practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  )
  OR
  user_id IN (
    SELECT d.user_id FROM public.doctors d
    JOIN public.practice_join_requests pjr ON pjr.doctor_id = d.id
    WHERE EXISTS (
      SELECT 1 FROM public.clinic_staff cs
      WHERE cs.practice_id = pjr.practice_id
        AND cs.user_id = auth.uid()
        AND cs.status = 'active'
    )
  )
);