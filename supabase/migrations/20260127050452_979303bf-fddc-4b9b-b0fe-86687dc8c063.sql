-- Create appointment_holds table for the pending confirmation flow
CREATE TABLE IF NOT EXISTS public.appointment_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_patient_id UUID REFERENCES public.doctor_patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  practice_id UUID REFERENCES public.practices(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'in_person',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'canceled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_holds_doctor_id ON public.appointment_holds(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_holds_patient_id ON public.appointment_holds(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_holds_status ON public.appointment_holds(status);
CREATE INDEX IF NOT EXISTS idx_appointment_holds_expires_at ON public.appointment_holds(expires_at);

-- Enable RLS
ALTER TABLE public.appointment_holds ENABLE ROW LEVEL SECURITY;

-- Policy: Patients can view their own holds
CREATE POLICY "Patients can view their own holds"
ON public.appointment_holds
FOR SELECT
USING (auth.uid() = patient_id);

-- Policy: Patients can create holds for themselves
CREATE POLICY "Patients can create holds for themselves"
ON public.appointment_holds
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Policy: Patients can update their own holds
CREATE POLICY "Patients can update their own holds"
ON public.appointment_holds
FOR UPDATE
USING (auth.uid() = patient_id);

-- Policy: Patients can delete their own holds
CREATE POLICY "Patients can delete their own holds"
ON public.appointment_holds
FOR DELETE
USING (auth.uid() = patient_id);

-- Policy: Doctors can view holds for their appointments
CREATE POLICY "Doctors can view holds for their appointments"
ON public.appointment_holds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = appointment_holds.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Create function to cleanup expired holds
CREATE OR REPLACE FUNCTION public.cleanup_expired_appointment_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.appointment_holds
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_appointment_holds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_holds_updated_at
BEFORE UPDATE ON public.appointment_holds
FOR EACH ROW
EXECUTE FUNCTION public.update_appointment_holds_updated_at();