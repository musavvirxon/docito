-- Per-doctor restrictions table for clinic admin rules
CREATE TABLE IF NOT EXISTS public.doctor_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  working_hours_restriction JSONB,
  specialty_restriction JSONB,
  procedure_restriction JSONB,
  max_daily_appointments INTEGER,
  max_weekly_appointments INTEGER,
  requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practice_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_restrictions_practice ON public.doctor_restrictions(practice_id);
CREATE INDEX IF NOT EXISTS idx_doctor_restrictions_doctor ON public.doctor_restrictions(doctor_id);

ALTER TABLE public.doctor_restrictions ENABLE ROW LEVEL SECURITY;

-- Practice admins/staff manage rules for their practice
CREATE POLICY "Practice can manage doctor restrictions"
  ON public.doctor_restrictions
  FOR ALL
  TO authenticated
  USING (public.can_access_practice(practice_id))
  WITH CHECK (public.can_access_practice(practice_id));

-- Doctors can read their own rules
CREATE POLICY "Doctors can read own restrictions"
  ON public.doctor_restrictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_restrictions.doctor_id AND d.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_doctor_restrictions_updated_at
  BEFORE UPDATE ON public.doctor_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();