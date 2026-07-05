
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_status TEXT NOT NULL DEFAULT 'arrived',
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_room_id ON public.appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_appointments_practice_date ON public.appointments(practice_id, appointment_date);

CREATE TABLE IF NOT EXISTS public.clinic_displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Waiting room display',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  room_id UUID REFERENCES public.clinic_rooms(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_displays TO authenticated;
GRANT ALL ON public.clinic_displays TO service_role;

ALTER TABLE public.clinic_displays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practice admins manage displays"
  ON public.clinic_displays FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.practices p WHERE p.id = clinic_displays.practice_id AND p.admin_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.practice_staff ps WHERE ps.practice_id = clinic_displays.practice_id AND ps.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.practices p WHERE p.id = clinic_displays.practice_id AND p.admin_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.practice_staff ps WHERE ps.practice_id = clinic_displays.practice_id AND ps.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.get_queue_display(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
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
      SELECT jsonb_agg(jsonb_build_object('room_id', r.id, 'room_name', r.name) ORDER BY r.name)
      FROM public.clinic_rooms r
      WHERE r.practice_id = p.id AND r.status = 'active'
    ), '[]'::jsonb),
    'queue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'room_id', a.room_id,
        'doctor_name', COALESCE(pr.full_name, '—'),
        'patient_name', COALESCE(pp.full_name, 'Patient'),
        'queue_status', a.queue_status,
        'called_at', a.called_at,
        'start_time', a.start_time
      ))
      FROM public.appointments a
      LEFT JOIN public.doctors d ON d.id = a.doctor_id
      LEFT JOIN public.profiles pr ON pr.id = d.user_id
      LEFT JOIN public.profiles pp ON pp.id = a.patient_id
      WHERE a.practice_id = p.id
        AND a.appointment_date = CURRENT_DATE
        AND a.room_id IS NOT NULL
        AND a.queue_status IN ('arrived','called','in_progress')
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.practices p
  WHERE p.id = _display.practice_id;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_display(TEXT) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_displays;
