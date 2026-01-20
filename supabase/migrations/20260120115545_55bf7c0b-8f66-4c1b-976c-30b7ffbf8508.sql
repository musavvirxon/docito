-- Create practice_verification table for clinic/practice verification workflow
CREATE TABLE IF NOT EXISTS public.practice_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  business_name text,
  business_type text,
  practice_size text,
  country text DEFAULT 'United States',
  state text,
  city text,
  zip_code text,
  full_address text,
  phone text,
  business_email text,
  website_url text,
  operating_hours jsonb,
  services_offered text[],
  specialties text[],
  practice_description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_verification ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practice admins can view their verification"
  ON public.practice_verification FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = practice_verification.practice_id
        AND p.admin_id = auth.uid()
    )
  );

CREATE POLICY "Practice admins can insert their verification"
  ON public.practice_verification FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = practice_verification.practice_id
        AND p.admin_id = auth.uid()
    )
  );

CREATE POLICY "Practice admins can update their verification"
  ON public.practice_verification FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = practice_verification.practice_id
        AND p.admin_id = auth.uid()
    )
  );

-- Super admins can manage all verifications
CREATE POLICY "Super admins can manage all verifications"
  ON public.practice_verification FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_practice_verification_practice_id ON public.practice_verification(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_verification_status ON public.practice_verification(status);

-- Add unique constraint to ensure one verification per practice
ALTER TABLE public.practice_verification ADD CONSTRAINT unique_practice_verification UNIQUE (practice_id);