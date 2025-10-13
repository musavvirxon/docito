-- Add comprehensive fields to practices table
ALTER TABLE public.practices
ADD COLUMN IF NOT EXISTS legal_business_name VARCHAR,
ADD COLUMN IF NOT EXISTS practice_type VARCHAR DEFAULT 'Clinic',
ADD COLUMN IF NOT EXISTS practice_size VARCHAR,
ADD COLUMN IF NOT EXISTS state VARCHAR,
ADD COLUMN IF NOT EXISTS zip_code VARCHAR,
ADD COLUMN IF NOT EXISTS website VARCHAR,
ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR,
ADD COLUMN IF NOT EXISTS year_established INTEGER,
ADD COLUMN IF NOT EXISTS business_owner VARCHAR,
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS how_heard_about_us VARCHAR,
ADD COLUMN IF NOT EXISTS agrees_to_updates BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agrees_to_terms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR DEFAULT 'pending';

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  status VARCHAR DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on verification_documents
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for verification_documents
CREATE POLICY "Practice admins can manage their documents"
ON public.verification_documents
FOR ALL
USING (
  practice_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all verification documents"
ON public.verification_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_verification_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_verification_documents_updated_at
BEFORE UPDATE ON public.verification_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_verification_documents_updated_at();