-- Create practice_restrictions table
CREATE TABLE public.practice_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  working_hours_restriction JSONB DEFAULT NULL,
  specialty_restriction JSONB DEFAULT NULL,
  procedure_restriction JSONB DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(practice_id)
);

-- Enable RLS
ALTER TABLE public.practice_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practice admins can view their restrictions"
ON public.practice_restrictions FOR SELECT
USING (practice_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()));

CREATE POLICY "Practice admins can insert their restrictions"
ON public.practice_restrictions FOR INSERT
WITH CHECK (practice_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()));

CREATE POLICY "Practice admins can update their restrictions"
ON public.practice_restrictions FOR UPDATE
USING (practice_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()));

CREATE POLICY "Doctors can view their practice restrictions"
ON public.practice_restrictions FOR SELECT
USING (practice_id IN (SELECT practice_id FROM doctors WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_practice_restrictions_updated_at
BEFORE UPDATE ON public.practice_restrictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_practice_restrictions_practice_id ON public.practice_restrictions(practice_id);