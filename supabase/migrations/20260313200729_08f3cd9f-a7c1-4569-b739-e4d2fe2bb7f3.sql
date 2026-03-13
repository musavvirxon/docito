
CREATE OR REPLACE FUNCTION public.account_analytics(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_appointments',
      (SELECT count(*) FROM appointments WHERE patient_id = p_user_id),
    'appointments_in_range',
      (SELECT count(*) FROM appointments
       WHERE patient_id = p_user_id
         AND created_at >= now() - (p_days || ' days')::interval),
    'upcoming_appointments',
      (SELECT count(*) FROM appointments
       WHERE patient_id = p_user_id
         AND appointment_date >= CURRENT_DATE
         AND status NOT IN ('canceled'::appointment_status, 'no_show'::appointment_status)),
    'completed_appointments',
      (SELECT count(*) FROM appointments
       WHERE patient_id = p_user_id
         AND status = 'completed'::appointment_status),
    'total_prescriptions',
      (SELECT count(*) FROM prescriptions WHERE patient_id = p_user_id),
    'prescriptions_in_range',
      (SELECT count(*) FROM prescriptions
       WHERE patient_id = p_user_id
         AND created_at >= now() - (p_days || ' days')::interval),
    'total_records',
      (SELECT count(*) FROM medical_records WHERE patient_id = p_user_id),
    'total_treatment_plans',
      (SELECT count(*) FROM treatment_plans WHERE patient_id = p_user_id),
    'total_diagnoses',
      (SELECT count(*) FROM appointment_diagnoses WHERE patient_id = p_user_id),
    'days', p_days
  );
$$;
