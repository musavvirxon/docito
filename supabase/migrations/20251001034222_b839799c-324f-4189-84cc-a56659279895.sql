-- Create schedule_settings table for doctor availability
CREATE TABLE IF NOT EXISTS public.schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  working_days JSONB NOT NULL DEFAULT '{
    "monday": {"enabled": true, "start_time": "09:00", "end_time": "17:00", "breaks": []},
    "tuesday": {"enabled": true, "start_time": "09:00", "end_time": "17:00", "breaks": []},
    "wednesday": {"enabled": true, "start_time": "09:00", "end_time": "17:00", "breaks": []},
    "thursday": {"enabled": true, "start_time": "09:00", "end_time": "17:00", "breaks": []},
    "friday": {"enabled": true, "start_time": "09:00", "end_time": "17:00", "breaks": []},
    "saturday": {"enabled": false, "start_time": "10:00", "end_time": "14:00", "breaks": []},
    "sunday": {"enabled": false, "start_time": "10:00", "end_time": "14:00", "breaks": []}
  }'::jsonb,
  buffer_time INTEGER DEFAULT 15,
  holidays TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Enable RLS
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view their own schedule settings
CREATE POLICY "Doctors can view own schedule settings"
ON public.schedule_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = schedule_settings.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Policy: Doctors can insert their own schedule settings
CREATE POLICY "Doctors can insert own schedule settings"
ON public.schedule_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = schedule_settings.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Policy: Doctors can update their own schedule settings
CREATE POLICY "Doctors can update own schedule settings"
ON public.schedule_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = schedule_settings.doctor_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = schedule_settings.doctor_id
    AND d.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_schedule_settings_updated_at
BEFORE UPDATE ON public.schedule_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_schedule_settings_doctor_id ON public.schedule_settings(doctor_id);