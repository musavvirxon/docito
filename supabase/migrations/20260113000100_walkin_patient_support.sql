-- 20260113000100_walkin_patient_support.sql
-- Walk-in / not-yet-signed-up patient support for:
-- - test_orders (lab manual orders)
-- - prescriptions + prescription_items (pharmacy manual orders)
-- - clinic_imaging_orders (imaging manual orders)
-- - referrals (universal referrals)
--
-- Adds patient_snapshot_* fields and makes patient_id nullable,
-- with CHECK constraint requiring patient_id OR patient_snapshot_full_name.

BEGIN;

--------------------------------------------------------------------------------
-- 1) LAB: test_orders
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.test_orders') IS NOT NULL THEN
    -- Allow walk-in patients
    ALTER TABLE public.test_orders
      ALTER COLUMN patient_id DROP NOT NULL;

    -- Snapshot fields for walk-in patients (used by your UI)
    ALTER TABLE public.test_orders
      ADD COLUMN IF NOT EXISTS patient_snapshot_full_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_phone TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_email TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_dob DATE,
      ADD COLUMN IF NOT EXISTS patient_snapshot_gender TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_address TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_id_number TEXT,
      ADD COLUMN IF NOT EXISTS external_patient_ref TEXT;

    -- Ensure we always have at least some patient identity
    ALTER TABLE public.test_orders
      DROP CONSTRAINT IF EXISTS test_orders_patient_required_chk;

    ALTER TABLE public.test_orders
      ADD CONSTRAINT test_orders_patient_required_chk
      CHECK (patient_id IS NOT NULL OR patient_snapshot_full_name IS NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_test_orders_external_patient_ref
      ON public.test_orders(external_patient_ref);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 2) PHARMACY: prescriptions + prescription_items
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.prescriptions') IS NOT NULL THEN
    -- Allow walk-in patients
    ALTER TABLE public.prescriptions
      ALTER COLUMN patient_id DROP NOT NULL;

    -- Snapshot fields for walk-in patients (used by your UI)
    ALTER TABLE public.prescriptions
      ADD COLUMN IF NOT EXISTS patient_snapshot_full_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_phone TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_email TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_dob DATE,
      ADD COLUMN IF NOT EXISTS patient_snapshot_gender TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_address TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_id_number TEXT,
      ADD COLUMN IF NOT EXISTS external_patient_ref TEXT;

    -- Ensure we always have at least some patient identity
    ALTER TABLE public.prescriptions
      DROP CONSTRAINT IF EXISTS prescriptions_patient_required_chk;

    ALTER TABLE public.prescriptions
      ADD CONSTRAINT prescriptions_patient_required_chk
      CHECK (patient_id IS NOT NULL OR patient_snapshot_full_name IS NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_prescriptions_external_patient_ref
      ON public.prescriptions(external_patient_ref);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 3) IMAGING (clinic_imaging_orders)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.clinic_imaging_orders') IS NOT NULL THEN
    -- Allow walk-in patients
    ALTER TABLE public.clinic_imaging_orders
      ALTER COLUMN patient_id DROP NOT NULL;

    -- Snapshot fields for walk-in patients
    ALTER TABLE public.clinic_imaging_orders
      ADD COLUMN IF NOT EXISTS patient_snapshot_full_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_phone TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_email TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_dob DATE,
      ADD COLUMN IF NOT EXISTS patient_snapshot_gender TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_address TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_id_number TEXT,
      ADD COLUMN IF NOT EXISTS external_patient_ref TEXT;

    ALTER TABLE public.clinic_imaging_orders
      DROP CONSTRAINT IF EXISTS clinic_imaging_orders_patient_required_chk;

    ALTER TABLE public.clinic_imaging_orders
      ADD CONSTRAINT clinic_imaging_orders_patient_required_chk
      CHECK (patient_id IS NOT NULL OR patient_snapshot_full_name IS NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_clinic_imaging_orders_external_patient_ref
      ON public.clinic_imaging_orders(external_patient_ref);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 4) REFERRALS (universal referrals table)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.referrals') IS NOT NULL THEN
    -- Allow walk-in patients
    ALTER TABLE public.referrals
      ALTER COLUMN patient_id DROP NOT NULL;

    -- Snapshot fields for walk-in patients
    ALTER TABLE public.referrals
      ADD COLUMN IF NOT EXISTS patient_snapshot_full_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_phone TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_email TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_dob DATE,
      ADD COLUMN IF NOT EXISTS patient_snapshot_gender TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_address TEXT,
      ADD COLUMN IF NOT EXISTS patient_snapshot_id_number TEXT,
      ADD COLUMN IF NOT EXISTS external_patient_ref TEXT;

    ALTER TABLE public.referrals
      DROP CONSTRAINT IF EXISTS referrals_patient_required_chk;

    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_patient_required_chk
      CHECK (patient_id IS NOT NULL OR patient_snapshot_full_name IS NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_referrals_external_patient_ref
      ON public.referrals(external_patient_ref);
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 5) RLS: allow PHARMACY STAFF to INSERT prescriptions + manage prescription_items
-- (Your current RLS only lets pharmacy staff SELECT/UPDATE prescriptions,
--  but does NOT allow INSERT, and does NOT allow INSERT into prescription_items.)
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.prescriptions') IS NOT NULL THEN
    -- Allow pharmacy staff to create prescriptions (manual RX)
    DROP POLICY IF EXISTS "Pharmacy staff can create prescriptions" ON public.prescriptions;

    CREATE POLICY "Pharmacy staff can create prescriptions"
    ON public.prescriptions
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.pharmacy_staff ps
        WHERE ps.pharmacy_id = prescriptions.pharmacy_id
          AND ps.user_id = auth.uid()
          AND ps.status = 'active'
          AND ps.can_process_prescriptions = true
      )
    );
  END IF;

  IF to_regclass('public.prescription_items') IS NOT NULL THEN
    -- Allow pharmacy staff to insert/update/delete prescription items for prescriptions in their pharmacy
    DROP POLICY IF EXISTS "Pharmacy staff can manage prescription items" ON public.prescription_items;

    CREATE POLICY "Pharmacy staff can manage prescription items"
    ON public.prescription_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.prescriptions p
        JOIN public.pharmacy_staff ps ON ps.pharmacy_id = p.pharmacy_id
        WHERE p.id = prescription_items.prescription_id
          AND ps.user_id = auth.uid()
          AND ps.status = 'active'
          AND ps.can_process_prescriptions = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.prescriptions p
        JOIN public.pharmacy_staff ps ON ps.pharmacy_id = p.pharmacy_id
        WHERE p.id = prescription_items.prescription_id
          AND ps.user_id = auth.uid()
          AND ps.status = 'active'
          AND ps.can_process_prescriptions = true
      )
    );
  END IF;
END $$;

COMMIT;
