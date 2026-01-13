-- 20260113090000_facility_patients_guest_orders.sql
-- Walk-in patients + allow facility dashboards to create orders for unregistered patients

BEGIN;

-- 1) Facility patient registry (walk-in patients per facility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'facility_type') THEN
    CREATE TYPE public.facility_type AS ENUM ('lab', 'pharmacy', 'imaging_center');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.facility_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_type public.facility_type NOT NULL,
  facility_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_type, facility_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_facility_patients_facility ON public.facility_patients(facility_type, facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_patients_phone ON public.facility_patients(phone);

ALTER TABLE public.facility_patients ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_facility_patients_updated_at'
  ) THEN
    CREATE TRIGGER update_facility_patients_updated_at
      BEFORE UPDATE ON public.facility_patients
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS helpers inline via EXISTS checks (no helper functions required)

-- SELECT policy
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Facility staff can view facility patients"
    ON public.facility_patients
    FOR SELECT
    USING (
      (
        facility_type = 'lab' AND (
          EXISTS (SELECT 1 FROM public.lab_centers lc WHERE lc.id = facility_id AND lc.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = facility_id AND ls.user_id = auth.uid() AND ls.status = 'active')
        )
      )
      OR
      (
        facility_type = 'pharmacy' AND (
          EXISTS (SELECT 1 FROM public.pharmacies ph WHERE ph.id = facility_id AND ph.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.pharmacy_staff ps WHERE ps.pharmacy_id = facility_id AND ps.user_id = auth.uid() AND ps.status = 'active')
        )
      )
      OR
      (
        facility_type = 'imaging_center' AND (
          EXISTS (SELECT 1 FROM public.imaging_centers ic WHERE ic.id = facility_id AND ic.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.imaging_staff ist WHERE ist.imaging_center_id = facility_id AND ist.user_id = auth.uid() AND ist.status = 'active')
        )
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- INSERT policy
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Facility staff can create facility patients"
    ON public.facility_patients
    FOR INSERT
    WITH CHECK (
      (
        facility_type = 'lab' AND (
          EXISTS (SELECT 1 FROM public.lab_centers lc WHERE lc.id = facility_id AND lc.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = facility_id AND ls.user_id = auth.uid() AND ls.status = 'active')
        )
      )
      OR
      (
        facility_type = 'pharmacy' AND (
          EXISTS (SELECT 1 FROM public.pharmacies ph WHERE ph.id = facility_id AND ph.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.pharmacy_staff ps WHERE ps.pharmacy_id = facility_id AND ps.user_id = auth.uid() AND ps.status = 'active')
        )
      )
      OR
      (
        facility_type = 'imaging_center' AND (
          EXISTS (SELECT 1 FROM public.imaging_centers ic WHERE ic.id = facility_id AND ic.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.imaging_staff ist WHERE ist.imaging_center_id = facility_id AND ist.user_id = auth.uid() AND ist.status = 'active')
        )
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- UPDATE policy (optional but useful)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Facility staff can update facility patients"
    ON public.facility_patients
    FOR UPDATE
    USING (
      (
        facility_type = 'lab' AND (
          EXISTS (SELECT 1 FROM public.lab_centers lc WHERE lc.id = facility_id AND lc.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = facility_id AND ls.user_id = auth.uid() AND ls.status = 'active')
        )
      )
      OR
      (
        facility_type = 'pharmacy' AND (
          EXISTS (SELECT 1 FROM public.pharmacies ph WHERE ph.id = facility_id AND ph.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.pharmacy_staff ps WHERE ps.pharmacy_id = facility_id AND ps.user_id = auth.uid() AND ps.status = 'active')
        )
      )
      OR
      (
        facility_type = 'imaging_center' AND (
          EXISTS (SELECT 1 FROM public.imaging_centers ic WHERE ic.id = facility_id AND ic.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.imaging_staff ist WHERE ist.imaging_center_id = facility_id AND ist.user_id = auth.uid() AND ist.status = 'active')
        )
      )
    )
    WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2) Allow TEST ORDERS to reference facility_patients (walk-in)
ALTER TABLE public.test_orders
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- allow either patient_id (registered) OR facility_patient_id (walk-in)
ALTER TABLE public.test_orders
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'test_orders_patient_xor_facility_patient'
  ) THEN
    ALTER TABLE public.test_orders
      ADD CONSTRAINT test_orders_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

-- RLS: allow lab staff/admin to INSERT test orders + items (manual walk-in orders)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Lab staff can create test orders for their lab"
    ON public.test_orders
    FOR INSERT
    WITH CHECK (
      lab_center_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.lab_centers lc WHERE lc.id = test_orders.lab_center_id AND lc.admin_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = test_orders.lab_center_id AND ls.user_id = auth.uid() AND ls.status = 'active')
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Lab staff can create test order items for their lab orders"
    ON public.test_order_items
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.test_orders o
        WHERE o.id = test_order_items.test_order_id
        AND o.lab_center_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.lab_centers lc WHERE lc.id = o.lab_center_id AND lc.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = o.lab_center_id AND ls.user_id = auth.uid() AND ls.status = 'active')
        )
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3) Allow PRESCRIPTIONS to reference facility_patients (walk-in)
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

ALTER TABLE public.prescriptions
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patient_xor_facility_patient'
  ) THEN
    ALTER TABLE public.prescriptions
      ADD CONSTRAINT prescriptions_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

-- RLS: allow pharmacy staff/admin to INSERT prescriptions + items (manual walk-in prescriptions)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Pharmacy staff can create prescriptions for their pharmacy"
    ON public.prescriptions
    FOR INSERT
    WITH CHECK (
      pharmacy_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.pharmacies ph WHERE ph.id = prescriptions.pharmacy_id AND ph.admin_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.pharmacy_staff ps WHERE ps.pharmacy_id = prescriptions.pharmacy_id AND ps.user_id = auth.uid() AND ps.status = 'active')
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Pharmacy staff can create prescription items for pharmacy prescriptions"
    ON public.prescription_items
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.prescriptions p
        WHERE p.id = prescription_items.prescription_id
        AND p.pharmacy_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.pharmacies ph WHERE ph.id = p.pharmacy_id AND ph.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.pharmacy_staff ps WHERE ps.pharmacy_id = p.pharmacy_id AND ps.user_id = auth.uid() AND ps.status = 'active')
        )
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 4) Allow REFERRALS (used by imaging center) to reference facility_patients (walk-in imaging orders)
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

ALTER TABLE public.referrals
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_patient_xor_facility_patient'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

COMMIT;
