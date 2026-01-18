-- File: supabase/migrations/20260118123000_phase3_facility_verification_drafts_and_admin_review.sql

-- ==========================================
-- Phase 3: Facility Verification Drafts + Admin Review
-- - Adds facility_verification_drafts (draft payload per facility)
-- - Extends facility_verification_requests with payload + rejection_reason
-- - Extends can_access_facility() to include practice_staff
-- - Extends verification_documents policies to allow lab/imaging facilities
-- ==========================================

BEGIN;

-- 1) Extend can_access_facility to include practice_staff for practices
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
    )
    OR EXISTS (
      SELECT 1
      FROM public.practice_staff ps
      WHERE ps.practice_id = p_facility_id
        AND ps.user_id = p_user_id
        AND ps.status = 'active'
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

-- 2) Add payload + rejection_reason to facility_verification_requests (idempotent)
ALTER TABLE public.facility_verification_requests
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_fvr_status ON public.facility_verification_requests(status);

-- 3) Create drafts table (one draft per facility)
CREATE TABLE IF NOT EXISTS public.facility_verification_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_type TEXT NOT NULL CHECK (facility_type IN ('practice', 'lab', 'imaging', 'pharmacy')),
  facility_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure one draft per facility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_fvd_facility'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_fvd_facility ON public.facility_verification_drafts (facility_type, facility_id)';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_fvd_facility ON public.facility_verification_drafts (facility_type, facility_id);
CREATE INDEX IF NOT EXISTS idx_fvd_updated_at ON public.facility_verification_drafts (updated_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_facility_verification_drafts_updated_at()
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

DROP TRIGGER IF EXISTS trg_touch_fvd_updated_at ON public.facility_verification_drafts;
CREATE TRIGGER trg_touch_fvd_updated_at
BEFORE UPDATE ON public.facility_verification_drafts
FOR EACH ROW
EXECUTE FUNCTION public.touch_facility_verification_drafts_updated_at();

-- RLS for drafts
ALTER TABLE public.facility_verification_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facility members can read verification drafts" ON public.facility_verification_drafts;
CREATE POLICY "Facility members can read verification drafts"
ON public.facility_verification_drafts
FOR SELECT
USING (
  public.can_access_facility(facility_type, facility_id, auth.uid())
);

DROP POLICY IF EXISTS "Facility members can create verification drafts" ON public.facility_verification_drafts;
CREATE POLICY "Facility members can create verification drafts"
ON public.facility_verification_drafts
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND public.can_access_facility(facility_type, facility_id, auth.uid())
);

DROP POLICY IF EXISTS "Facility members can update verification drafts" ON public.facility_verification_drafts;
CREATE POLICY "Facility members can update verification drafts"
ON public.facility_verification_drafts
FOR UPDATE
USING (
  public.can_access_facility(facility_type, facility_id, auth.uid())
);

DROP POLICY IF EXISTS "Super admins can read all verification drafts" ON public.facility_verification_drafts;
CREATE POLICY "Super admins can read all verification drafts"
ON public.facility_verification_drafts
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Super admins can update all verification drafts" ON public.facility_verification_drafts;
CREATE POLICY "Super admins can update all verification drafts"
ON public.facility_verification_drafts
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- 4) Extend verification_documents policies to support lab + imaging + facility members
-- Existing policies may differ across environments; we drop and recreate the key ones safely.
DO $$
BEGIN
  -- Drop legacy policies if present
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_documents' AND policyname='Entity owners can manage their verification documents') THEN
    EXECUTE 'DROP POLICY "Entity owners can manage their verification documents" ON public.verification_documents';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_documents' AND policyname='Super admins can manage all verification documents') THEN
    EXECUTE 'DROP POLICY "Super admins can manage all verification documents" ON public.verification_documents';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_documents' AND policyname='Practice admins can manage their documents') THEN
    EXECUTE 'DROP POLICY "Practice admins can manage their documents" ON public.verification_documents';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_documents' AND policyname='Admins can view all verification documents') THEN
    EXECUTE 'DROP POLICY "Admins can view all verification documents" ON public.verification_documents';
  END IF;
END
$$;

-- Entity/facility members can manage their verification docs (practice/pharmacy/doctor/lab/imaging)
CREATE POLICY "Entity owners can manage their verification documents" ON public.verification_documents
FOR ALL
USING (
  (
    entity_type = 'practice'
    AND public.can_access_facility('practice', verification_documents.entity_id, auth.uid())
  )
  OR (
    entity_type = 'pharmacy'
    AND public.can_access_facility('pharmacy', verification_documents.entity_id, auth.uid())
  )
  OR (
    entity_type = 'lab'
    AND public.can_access_facility('lab', verification_documents.entity_id, auth.uid())
  )
  OR (
    entity_type = 'imaging'
    AND public.can_access_facility('imaging', verification_documents.entity_id, auth.uid())
  )
  OR (
    entity_type = 'doctor'
    AND EXISTS (
      SELECT 1
      FROM public.doctors d
      WHERE d.id = verification_documents.entity_id
        AND d.user_id = auth.uid()
    )
  )
);

-- Super admins can manage all verification docs
CREATE POLICY "Super admins can manage all verification documents" ON public.verification_documents
FOR ALL
USING (
  public.has_role(auth.uid(), 'super_admin')
);

COMMIT;
