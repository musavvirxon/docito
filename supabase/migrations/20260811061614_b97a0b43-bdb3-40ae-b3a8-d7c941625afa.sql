CREATE OR REPLACE FUNCTION public.get_practice_billing_names(p_practice_id uuid)
RETURNS TABLE (
  appointment_id uuid,
  patient_name text,
  doctor_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (a.id)
    a.id AS appointment_id,
    COALESCE(NULLIF(dp.full_name, ''), NULLIF(patient_profile.full_name, ''))::text AS patient_name,
    NULLIF(doctor_profile.full_name, '')::text AS doctor_name
  FROM public.appointments a
  LEFT JOIN public.doctor_patients dp
    ON dp.id = a.doctor_patient_id
  LEFT JOIN public.profiles patient_profile
    ON patient_profile.user_id = a.patient_id
  LEFT JOIN public.doctors d
    ON d.id = a.doctor_id
  LEFT JOIN public.profiles doctor_profile
    ON doctor_profile.user_id = d.user_id
  WHERE a.practice_id = p_practice_id
    AND public.can_access_practice(p_practice_id)
  ORDER BY a.id;
$$;

REVOKE ALL ON FUNCTION public.get_practice_billing_names(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practice_billing_names(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_practice_billing_names(uuid) TO service_role;