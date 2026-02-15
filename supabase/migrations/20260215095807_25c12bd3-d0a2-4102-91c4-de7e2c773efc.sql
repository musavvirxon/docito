
-- Create the facility_verification_requests table used by the facility-verification-admin edge function
CREATE TABLE public.facility_verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_type TEXT NOT NULL CHECK (facility_type IN ('practice', 'lab', 'imaging', 'pharmacy')),
  facility_id UUID NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'rejected', 'cancelled')),
  comment TEXT,
  rejection_reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facility_verification_requests ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything (via edge function with service role, but add policies for safety)
CREATE POLICY "Super admins can view all verification requests"
ON public.facility_verification_requests
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can update verification requests"
ON public.facility_verification_requests
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Facility admins can view their own requests
CREATE POLICY "Facility admins can view own requests"
ON public.facility_verification_requests
FOR SELECT
USING (requested_by = auth.uid());

-- Facility admins can create requests
CREATE POLICY "Facility admins can create requests"
ON public.facility_verification_requests
FOR INSERT
WITH CHECK (requested_by = auth.uid());

-- Index for common queries
CREATE INDEX idx_fvr_facility_type_status ON public.facility_verification_requests(facility_type, status);
CREATE INDEX idx_fvr_requested_by ON public.facility_verification_requests(requested_by);

-- Trigger for updated_at
CREATE TRIGGER update_facility_verification_requests_updated_at
BEFORE UPDATE ON public.facility_verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
