
-- 1) Backfill
UPDATE public.payments p
SET practice_id = d.practice_id
FROM public.doctors d
WHERE p.practice_id IS NULL
  AND p.doctor_id = d.id
  AND d.practice_id IS NOT NULL;

-- 2) Trigger
CREATE OR REPLACE FUNCTION public.set_payments_practice_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.practice_id IS NULL AND NEW.doctor_id IS NOT NULL THEN
    SELECT d.practice_id INTO NEW.practice_id
    FROM public.doctors d
    WHERE d.id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payments_practice_id ON public.payments;
CREATE TRIGGER trg_set_payments_practice_id
BEFORE INSERT OR UPDATE OF doctor_id, practice_id
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_payments_practice_id();

-- 3) RPC: drop existing then create
DROP FUNCTION IF EXISTS public.get_practice_appointments(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_practice_appointments(
  p_practice_id uuid,
  p_limit_count integer DEFAULT 500
)
RETURNS TABLE(
  id uuid,
  appointment_date date,
  start_time time,
  end_time time,
  status text,
  patient_id uuid,
  doctor_id uuid,
  doctor_name text,
  patient_name text,
  appointment_type text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_access_practice(p_practice_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status::text,
    a.patient_id,
    a.doctor_id,
    COALESCE(doc.full_name, 'Doctor')::text AS doctor_name,
    COALESCE(pat.full_name, 'Patient')::text AS patient_name,
    COALESCE(a.appointment_type::text, '')::text AS appointment_type,
    a.notes,
    a.created_at
  FROM public.appointments a
  LEFT JOIN public.doctors d ON d.id = a.doctor_id
  LEFT JOIN public.profiles doc ON doc.user_id = d.user_id
  LEFT JOIN public.profiles pat ON pat.user_id = a.patient_id
  WHERE a.practice_id = p_practice_id
  ORDER BY a.appointment_date DESC NULLS LAST, a.start_time DESC NULLS LAST
  LIMIT p_limit_count;
END;
$$;

-- 4) Update stats
CREATE OR REPLACE FUNCTION public.get_practice_stats(p_practice_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stats JSON;
  v_total_bookings INTEGER;
  v_total_patients INTEGER;
  v_total_revenue NUMERIC;
  v_payments_revenue NUMERIC;
  v_pending_invites INTEGER;
  v_total_doctors INTEGER;
  v_total_locations INTEGER;
  v_clinic_rating NUMERIC;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM practices WHERE id = p_practice_id AND admin_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'super_admin')
    AND NOT public.can_access_practice(p_practice_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COUNT(*) INTO v_total_bookings
  FROM appointments
  WHERE practice_id = p_practice_id
    AND status IN ('confirmed', 'completed');

  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM appointments
  WHERE practice_id = p_practice_id
    AND patient_id IS NOT NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_payments_revenue
  FROM payments
  WHERE practice_id = p_practice_id
    AND LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'succeeded');

  IF v_payments_revenue > 0 THEN
    v_total_revenue := v_payments_revenue;
  ELSE
    SELECT COALESCE(SUM(d.consultation_fee), 0) INTO v_total_revenue
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.practice_id = p_practice_id
      AND a.status = 'completed';
  END IF;

  SELECT COUNT(*) INTO v_pending_invites
  FROM practice_join_requests
  WHERE practice_id = p_practice_id
    AND status = 'pending';

  SELECT COUNT(*) INTO v_total_doctors
  FROM doctors
  WHERE practice_id = p_practice_id;

  SELECT COUNT(*) INTO v_total_locations
  FROM practice_locations
  WHERE practice_id = p_practice_id;

  SELECT COALESCE(average_rating, 0) INTO v_clinic_rating
  FROM practices
  WHERE id = p_practice_id;

  v_stats := json_build_object(
    'total_bookings', COALESCE(v_total_bookings, 0),
    'total_patients', COALESCE(v_total_patients, 0),
    'total_revenue', COALESCE(v_total_revenue, 0),
    'pending_invites', COALESCE(v_pending_invites, 0),
    'total_doctors', COALESCE(v_total_doctors, 0),
    'locations', COALESCE(v_total_locations, 0),
    'clinic_rating', COALESCE(v_clinic_rating, 0)
  );

  RETURN v_stats;
END;
$$;
