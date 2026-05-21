CREATE OR REPLACE FUNCTION public.get_practice_patients(p_practice_id uuid, p_limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  last_visit date,
  doctor_name text,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_practice(p_practice_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (pat.user_id)
    pat.user_id AS id,
    pat.full_name,
    pat.email,
    pat.phone,
    a.appointment_date AS last_visit,
    COALESCE(doc.full_name, 'Doctor') AS doctor_name,
    'active'::text AS status
  FROM appointments a
  JOIN profiles pat ON pat.user_id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id
  LEFT JOIN profiles doc ON doc.user_id = d.user_id
  WHERE a.practice_id = p_practice_id
    AND a.status IS DISTINCT FROM 'cancelled'
  ORDER BY pat.user_id, a.appointment_date DESC NULLS LAST
  LIMIT p_limit_count;
END;
$$;