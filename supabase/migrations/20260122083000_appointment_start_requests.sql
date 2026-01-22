ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS start_requested_by_doctor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_requested_by_patient boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_requested_doctor_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS start_requested_patient_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_start_requested_doctor
  ON public.appointments(start_requested_by_doctor);

CREATE INDEX IF NOT EXISTS idx_appointments_start_requested_patient
  ON public.appointments(start_requested_by_patient);
