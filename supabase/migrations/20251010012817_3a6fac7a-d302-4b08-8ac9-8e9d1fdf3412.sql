-- Create practice_join_requests table
CREATE TABLE IF NOT EXISTS public.practice_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(doctor_id, practice_id)
);

-- Enable RLS
ALTER TABLE public.practice_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Doctors can view their own requests"
ON public.practice_join_requests FOR SELECT
TO authenticated
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can create join requests"
ON public.practice_join_requests FOR INSERT
TO authenticated
WITH CHECK (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can delete their own pending requests"
ON public.practice_join_requests FOR DELETE
TO authenticated
USING (
  status = 'pending' AND doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_practice_join_requests_doctor ON practice_join_requests(doctor_id);
CREATE INDEX idx_practice_join_requests_practice ON practice_join_requests(practice_id);
CREATE INDEX idx_practice_join_requests_status ON practice_join_requests(status);