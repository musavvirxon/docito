
-- Add location_id to practice_join_requests
ALTER TABLE public.practice_join_requests
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.practice_locations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_practice_join_requests_location_id ON public.practice_join_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_practice_join_requests_practice_id ON public.practice_join_requests(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_join_requests_doctor_id ON public.practice_join_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_practice_join_requests_status ON public.practice_join_requests(status);
