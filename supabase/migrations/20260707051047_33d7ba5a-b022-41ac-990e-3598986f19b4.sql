-- 1. Add primary doctor assignment to clinic_rooms
ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS primary_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_rooms_primary_doctor
  ON public.clinic_rooms(primary_doctor_id);

-- 2. Rewrite get_queue_display: VOLATILE (allows UPDATE), correct joins, correct room filter
CREATE OR REPLACE FUNCTION public.get_queue_display(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display public.clinic_displays;
  _result JSONB;
BEGIN
  SELECT * INTO _display FROM public.clinic_displays WHERE token = _token AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.clinic_displays SET last_seen_at = now() WHERE id = _display.id;

  SELECT jsonb_build_object(
    'practice_id', p.id,
    'practice_name', p.name,
    'rooms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'room_id', r.id,
        'room_name', r.name,
        'room_number', r.room_number
      ) ORDER BY r.name)
      FROM public.clinic_rooms r
      WHERE r.practice_id = p.id
        AND (_display.room_id IS NULL OR r.id = _display.room_id)
    ), '[]'::jsonb),
    'queue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'room_id', a.room_id,
        'doctor_name', COALESCE(pr.full_name, '—'),
        'patient_name', COALESCE(pp.full_name, 'Patient'),
        'queue_status', a.queue_status,
        'called_at', a.called_at,
        'start_time', a.start_time
      ) ORDER BY a.start_time)
      FROM public.appointments a
      LEFT JOIN public.doctors d ON d.id = a.doctor_id
      LEFT JOIN public.profiles pr ON pr.user_id = d.user_id
      LEFT JOIN public.profiles pp ON pp.user_id = a.patient_id
      WHERE a.practice_id = p.id
        AND a.appointment_date = CURRENT_DATE
        AND a.room_id IS NOT NULL
        AND a.queue_status IN ('arrived','called','in_progress')
        AND (_display.room_id IS NULL OR a.room_id = _display.room_id)
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.practices p
  WHERE p.id = _display.practice_id;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_display(TEXT) TO anon, authenticated;