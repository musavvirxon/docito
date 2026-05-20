-- Replace get_practice_appointments with a SECURITY DEFINER version that
-- returns full appointment context for clinic admin dashboards and casts
-- profile names to text so the RPC doesn't fail at runtime.
DROP FUNCTION IF EXISTS public.get_practice_appointments(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_practice_appointments(
  p_practice_id uuid,
  p_limit_count integer DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  practice_id uuid,
  doctor_id uuid,
  doctor_name text,
  patient_id uuid,
  patient_name text,
  appointment_date date,
  start_time time,
  end_time time,
  status text,
  appointment_type text,
  procedure_id uuid,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: practice admin, active clinic_staff, active practice_staff, or super admin
  IF NOT (
    EXISTS (SELECT 1 FROM practices p WHERE p.id = p_practice_id AND p.admin_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.practice_id = p_practice_id
        AND cs.user_id = auth.uid()
        AND COALESCE(cs.status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM practice_staff ps
      WHERE ps.practice_id = p_practice_id
        AND ps.user_id = auth.uid()
        AND COALESCE(ps.status, 'active') = 'active'
    )
    OR public.has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not allowed to view appointments for this practice';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.practice_id,
    a.doctor_id,
    COALESCE(doc.full_name, 'Doctor')::text AS doctor_name,
    a.patient_id,
    COALESCE(pat.full_name, 'Patient')::text AS patient_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status::text,
    a.appointment_type::text,
    a.procedure_id,
    a.notes,
    a.created_at
  FROM appointments a
  LEFT JOIN profiles pat ON pat.user_id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id
  LEFT JOIN profiles doc ON doc.user_id = d.user_id
  WHERE a.practice_id = p_practice_id
  ORDER BY a.appointment_date DESC NULLS LAST, a.start_time DESC NULLS LAST
  LIMIT p_limit_count;
END;
$$;