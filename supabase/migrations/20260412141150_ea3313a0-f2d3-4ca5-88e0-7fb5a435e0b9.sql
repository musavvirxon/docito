-- Allow practice admins to view join requests for their practice
CREATE POLICY "Practice admins can view join requests"
ON public.practice_join_requests
FOR SELECT
TO authenticated
USING (
  practice_id IN (
    SELECT id FROM public.practices WHERE admin_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.clinic_staff
    WHERE clinic_staff.practice_id = practice_join_requests.practice_id
      AND clinic_staff.user_id = auth.uid()
      AND clinic_staff.status = 'active'
  )
);

-- Allow practice admins to update join requests (accept/reject)
CREATE POLICY "Practice admins can update join requests"
ON public.practice_join_requests
FOR UPDATE
TO authenticated
USING (
  practice_id IN (
    SELECT id FROM public.practices WHERE admin_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.clinic_staff
    WHERE clinic_staff.practice_id = practice_join_requests.practice_id
      AND clinic_staff.user_id = auth.uid()
      AND clinic_staff.status = 'active'
  )
)
WITH CHECK (
  practice_id IN (
    SELECT id FROM public.practices WHERE admin_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.clinic_staff
    WHERE clinic_staff.practice_id = practice_join_requests.practice_id
      AND clinic_staff.user_id = auth.uid()
      AND clinic_staff.status = 'active'
  )
);