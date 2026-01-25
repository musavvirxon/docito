-- Add start request columns to appointments table for appointment start workflow
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS start_requested_by_doctor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS start_requested_by_patient boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_start_requests 
ON public.appointments (start_requested_by_doctor, start_requested_by_patient);