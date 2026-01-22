-- Add appointment_type enum
CREATE TYPE public.appointment_type AS ENUM ('in_person', 'video', 'home_visit', 'messaging', 'follow_up');

-- Add columns to appointments table
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS appointment_type public.appointment_type NOT NULL DEFAULT 'in_person',
ADD COLUMN IF NOT EXISTS patient_confirmation_status TEXT DEFAULT 'pending' CHECK (patient_confirmation_status IN ('pending', 'confirmed', 'declined')),
ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS session_type TEXT,
ADD COLUMN IF NOT EXISTS video_room_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_type ON public.appointments(appointment_type);
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation ON public.appointments(patient_confirmation_status);

-- Create appointment_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.appointment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  patient_id UUID,
  doctor_patient_id UUID,
  session_type public.appointment_type NOT NULL,
  session_status TEXT NOT NULL DEFAULT 'waiting' CHECK (session_status IN ('waiting', 'active', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  video_room_id TEXT,
  notes JSONB,
  specialty_data JSONB, -- Store specialty-specific data (dental chart, procedures, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Enable RLS
ALTER TABLE public.appointment_sessions ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own sessions
CREATE POLICY "Doctors can manage their sessions"
ON public.appointment_sessions
FOR ALL
USING (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Patients can view their sessions
CREATE POLICY "Patients can view their sessions"
ON public.appointment_sessions
FOR SELECT
USING (
  patient_id = auth.uid()
);

-- Create update trigger for updated_at
CREATE TRIGGER update_appointment_sessions_updated_at
BEFORE UPDATE ON public.appointment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.appointment_sessions IS 'Tracks active appointment sessions with specialty-specific data';