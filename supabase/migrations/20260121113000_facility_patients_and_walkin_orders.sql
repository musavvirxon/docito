BEGIN;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facility_patients_updated_at') THEN
    CREATE TRIGGER update_facility_patients_updated_at
      BEFORE UPDATE ON public.facility_patients
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

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

--------------------------------------------------------------------------------
-- 2) Walk-in support columns + XOR constraints (patient_id vs facility_patient_id)
--------------------------------------------------------------------------------
-- LAB: test_orders
ALTER TABLE public.test_orders
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

ALTER TABLE public.test_orders
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_orders_patient_xor_facility_patient') THEN
    ALTER TABLE public.test_orders
      ADD CONSTRAINT test_orders_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

-- PHARMACY: prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

ALTER TABLE public.prescriptions
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patient_xor_facility_patient') THEN
    ALTER TABLE public.prescriptions
      ADD CONSTRAINT prescriptions_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

-- IMAGING: referrals (imaging "order" uses referrals + imaging_order_state)
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS facility_patient_id UUID REFERENCES public.facility_patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_email TEXT;

ALTER TABLE public.referrals
  ALTER COLUMN patient_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referrals_patient_xor_facility_patient') THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_patient_xor_facility_patient
      CHECK (
        (patient_id IS NOT NULL AND facility_patient_id IS NULL)
        OR
        (patient_id IS NULL AND facility_patient_id IS NOT NULL)
      );
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 3) FIX: remove any referrals triggers that still reference legacy NEW.referrer_id
--------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'referrals'
      AND NOT t.tgisinternal
      AND (
        p.prosrc ILIKE '%new.referrer_id%'
        OR p.prosrc ILIKE '%new.receiver_id%'
        OR p.prosrc ILIKE '%referrer_id%'
        OR p.prosrc ILIKE '%receiver_id%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.referrals', r.tgname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_referral_entity_user_id(
  p_entity_type public.referral_entity_type,
  p_entity_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_entity_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_entity_type = 'doctor' THEN
    SELECT d.user_id INTO v_user_id
    FROM public.doctors d
    WHERE d.id = p_entity_id;
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_referral_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  v_referrer_user_id uuid;
  v_receiver_user_id uuid;
  v_created_by uuid;
BEGIN
  v_referrer_user_id := COALESCE(
    NEW.referrer_user_id,
    public.resolve_referral_entity_user_id(NEW.referrer_type, NEW.referrer_entity_id)
  );

  v_receiver_user_id := COALESCE(
    NEW.receiver_user_id,
    public.resolve_referral_entity_user_id(NEW.receiver_type, NEW.receiver_entity_id)
  );

  v_created_by := COALESCE(v_referrer_user_id, NEW.patient_id);

  IF v_created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.conversations (type, name, context_type, context_id, created_by)
  VALUES ('group', 'Referral Discussion', 'referral', NEW.id, v_created_by)
  RETURNING id INTO new_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  SELECT * FROM (
    VALUES
      (new_conv_id, v_referrer_user_id, 'referrer'),
      (new_conv_id, NEW.patient_id, 'patient'),
      (new_conv_id, v_receiver_user_id, 'receiver')
  ) AS v(conversation_id, user_id, role)
  WHERE v.user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_referral_messaging_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id uuid;
  v_receiver_user_id uuid;
BEGIN
  v_referrer_user_id := COALESCE(
    NEW.referrer_user_id,
    public.resolve_referral_entity_user_id(NEW.referrer_type, NEW.referrer_entity_id)
  );

  v_receiver_user_id := COALESCE(
    NEW.receiver_user_id,
    public.resolve_referral_entity_user_id(NEW.receiver_type, NEW.receiver_entity_id)
  );

  IF NEW.patient_id IS NOT NULL AND v_referrer_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_referrer_user_id, NEW.patient_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, v_referrer_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.patient_id IS NOT NULL AND v_receiver_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_receiver_user_id, NEW.patient_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, v_receiver_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_referrer_user_id IS NOT NULL AND v_receiver_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_referrer_user_id, v_receiver_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_receiver_user_id, v_referrer_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_referral_conversation ON public.referrals;
CREATE TRIGGER trigger_create_referral_conversation
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_conversation();

DROP TRIGGER IF EXISTS trigger_referral_messaging_permission ON public.referrals;
CREATE TRIGGER trigger_referral_messaging_permission
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_messaging_permission();

COMMIT;
