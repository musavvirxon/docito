CREATE OR REPLACE FUNCTION public.doctor_can_view_patient_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = target_user_id
      AND d.user_id = auth.uid()
  )
$$;