-- File: supabase/migrations/20260117120000_facility_verification_requests.sql

-- ==========================================
-- Facility verification requests (labs, imaging, pharmacies, practices)
-- ==========================================

-- Create helper function to check whether a user can access a facility
CREATE OR REPLACE FUNCTION public.can_access_facility(
  p_facility_type TEXT,
  p_facility_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_facility_type = 'practice' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.practices pr
      WHERE pr.id = p_facility_id
        AND pr.admin_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.clinic_staff cs
      WHERE cs.practice_id = p_facility_id
        AND cs.user_id = p_user_id
        AND cs.status = 'active'
    );

  ELSIF p_facility_type = 'lab' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.lab_centers lc
      WHERE lc.id = p_facility_id
        AND lc.admin_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.lab_staff ls
      WHERE ls.lab_center_id = p_facility_id
        AND ls.user_id = p_user_id
        AND ls.status = 'active'
    );

  ELSIF p_facility_type = 'imaging' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.imaging_centers ic
      WHERE ic.id = p_facility_id
        AND ic.admin_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.imaging_staff isf
      WHERE isf.imaging_center_id = p_facility_id
        AND isf.user_id = p_user_id
        AND isf.status = 'active'
    );

  ELSIF p_facility_type = 'pharmacy' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.pharmacies ph
      WHERE ph.id = p_facility_id
        AND ph.admin_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.pharmacy_staff ps
      WHERE ps.pharmacy_id = p_facility_id
        AND ps.user_id = p_user_id
        AND ps.status = 'active'
    );

  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Facility verification request table
CREATE TABLE IF NOT EXISTS public.facility_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_type TEXT NOT NULL CHECK (facility_type IN ('practice', 'lab', 'imaging', 'pharmacy')),
  facility_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'rejected', 'cancelled')),
  comment TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_fvr_facility ON public.facility_verification_requests (facility_type, facility_id);
CREATE INDEX IF NOT EXISTS idx_fvr_requested_by ON public.facility_verification_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_fvr_created_at ON public.facility_verification_requests (created_at DESC);

-- Prevent duplicate active submissions (submitted/in_review) per facility
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fvr_active_per_facility
ON public.facility_verification_requests (facility_type, facility_id)
WHERE status IN ('submitted', 'in_review');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_facility_verification_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_fvr_updated_at ON public.facility_verification_requests;
CREATE TRIGGER trg_touch_fvr_updated_at
BEFORE UPDATE ON public.facility_verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.touch_facility_verification_requests_updated_at();

-- RLS
ALTER TABLE public.facility_verification_requests ENABLE ROW LEVEL SECURITY;

-- Facility admins/staff can read their own facility requests
DROP POLICY IF EXISTS "Facility members can read their facility verification requests" ON public.facility_verification_requests;
CREATE POLICY "Facility members can read their facility verification requests"
ON public.facility_verification_requests
FOR SELECT
USING (
  public.can_access_facility(facility_type, facility_id, auth.uid())
);

-- Facility admins/staff can create a request for their facility
DROP POLICY IF EXISTS "Facility members can create verification requests" ON public.facility_verification_requests;
CREATE POLICY "Facility members can create verification requests"
ON public.facility_verification_requests
FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
  AND public.can_access_facility(facility_type, facility_id, auth.uid())
);

-- Super admins can review/update all requests
DROP POLICY IF EXISTS "Super admins can update all facility verification requests" ON public.facility_verification_requests;
CREATE POLICY "Super admins can update all facility verification requests"
ON public.facility_verification_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can read all requests
DROP POLICY IF EXISTS "Super admins can read all facility verification requests" ON public.facility_verification_requests;
CREATE POLICY "Super admins can read all facility verification requests"
ON public.facility_verification_requests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
);
