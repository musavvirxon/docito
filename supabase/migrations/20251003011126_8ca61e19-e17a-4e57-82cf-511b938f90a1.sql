-- Create blocked_times table for doctors to block specific time slots
CREATE TABLE IF NOT EXISTS public.blocked_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type VARCHAR(50) DEFAULT 'personal',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own blocked times
CREATE POLICY "Doctors can manage their own blocked times"
ON public.blocked_times
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = blocked_times.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Create availability_overrides table for custom availability
CREATE TABLE IF NOT EXISTS public.availability_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own availability overrides
CREATE POLICY "Doctors can manage their own availability overrides"
ON public.availability_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = availability_overrides.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Create google_calendar_sync table
CREATE TABLE IF NOT EXISTS public.google_calendar_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL UNIQUE REFERENCES public.doctors(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own Google Calendar sync
CREATE POLICY "Doctors can manage their own Google Calendar sync"
ON public.google_calendar_sync
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = google_calendar_sync.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_times_doctor_date ON public.blocked_times(doctor_id, blocked_date);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_doctor_date ON public.availability_overrides(doctor_id, override_date);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_blocked_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blocked_times_updated_at
  BEFORE UPDATE ON public.blocked_times
  FOR EACH ROW
  EXECUTE FUNCTION update_blocked_times_updated_at();

CREATE TRIGGER update_availability_overrides_updated_at
  BEFORE UPDATE ON public.availability_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON public.google_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();