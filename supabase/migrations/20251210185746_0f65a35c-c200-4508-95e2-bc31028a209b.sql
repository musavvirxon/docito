-- Create video consultations table
CREATE TABLE public.video_consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show')),
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  doctor_joined_at TIMESTAMP WITH TIME ZONE,
  patient_joined_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_consultations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_video_consultations_doctor ON public.video_consultations(doctor_id);
CREATE INDEX idx_video_consultations_patient ON public.video_consultations(patient_id);
CREATE INDEX idx_video_consultations_appointment ON public.video_consultations(appointment_id);
CREATE INDEX idx_video_consultations_status ON public.video_consultations(status);
CREATE INDEX idx_video_consultations_room ON public.video_consultations(room_id);

-- RLS Policies
CREATE POLICY "Doctors can view their consultations"
ON public.video_consultations FOR SELECT
TO authenticated
USING (
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  OR patient_id = auth.uid()
);

CREATE POLICY "Doctors can create consultations"
ON public.video_consultations FOR INSERT
TO authenticated
WITH CHECK (
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Participants can update consultations"
ON public.video_consultations FOR UPDATE
TO authenticated
USING (
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  OR patient_id = auth.uid()
);

-- Trigger for updated_at
CREATE TRIGGER update_video_consultations_updated_at
BEFORE UPDATE ON public.video_consultations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique room ID
CREATE OR REPLACE FUNCTION public.generate_video_room_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  room_id TEXT;
BEGIN
  room_id := 'docito-' || encode(gen_random_bytes(8), 'hex');
  RETURN room_id;
END;
$$;