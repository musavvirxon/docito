
-- 1. Backfill payments.practice_id from doctor
UPDATE public.payments p
SET practice_id = d.practice_id
FROM public.doctors d
WHERE p.doctor_id = d.id
  AND p.practice_id IS NULL
  AND d.practice_id IS NOT NULL;

-- 2. Backfill billing_invoices: when doctor_id set but entity is still 'doctor' and that doctor belongs to a clinic,
--    keep entity_type='doctor' (so doctor RLS still works) AND populate metadata practice_id for clinic reads via separate column.
--    Easiest: add nullable practice_id column for join convenience.
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS practice_id uuid;

UPDATE public.billing_invoices bi
SET practice_id = COALESCE(
  CASE WHEN bi.entity_type IN ('practice','clinic') THEN bi.entity_id ELSE NULL END,
  d.practice_id
)
FROM public.doctors d
WHERE (bi.doctor_id = d.id OR (bi.entity_type='doctor' AND bi.entity_id = d.id))
  AND bi.practice_id IS NULL;

-- Standalone practice invoices
UPDATE public.billing_invoices
SET practice_id = entity_id
WHERE practice_id IS NULL AND entity_type IN ('practice','clinic');

CREATE INDEX IF NOT EXISTS idx_billing_invoices_practice_id ON public.billing_invoices(practice_id);
CREATE INDEX IF NOT EXISTS idx_payments_practice_id ON public.payments(practice_id);

-- 3. Trigger to auto-set billing_invoices.practice_id from doctor on insert/update
CREATE OR REPLACE FUNCTION public.set_invoice_practice_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.practice_id IS NULL THEN
    IF NEW.entity_type IN ('practice','clinic') THEN
      NEW.practice_id := NEW.entity_id;
    ELSIF NEW.doctor_id IS NOT NULL THEN
      SELECT d.practice_id INTO NEW.practice_id FROM public.doctors d WHERE d.id = NEW.doctor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invoice_practice_id ON public.billing_invoices;
CREATE TRIGGER trg_set_invoice_practice_id
  BEFORE INSERT OR UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_practice_id();

-- 4. Allow clinic admins and billing staff to see invoices via practice_id (in addition to existing policies)
DROP POLICY IF EXISTS "Practice can view invoices via practice_id" ON public.billing_invoices;
CREATE POLICY "Practice can view invoices via practice_id"
  ON public.billing_invoices FOR SELECT
  USING (
    practice_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.practices p WHERE p.id = billing_invoices.practice_id AND p.admin_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clinic_staff cs
        WHERE cs.practice_id = billing_invoices.practice_id
          AND cs.user_id = auth.uid()
          AND cs.status = 'active'
          AND COALESCE(cs.can_manage_billing, false) = true
      )
    )
  );

-- 5. Superbills table
CREATE TABLE IF NOT EXISTS public.superbills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superbill_number text NOT NULL,
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','submitted','paid','denied')),
  pdf_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superbills_practice_id ON public.superbills(practice_id);
CREATE INDEX IF NOT EXISTS idx_superbills_doctor_id ON public.superbills(doctor_id);
CREATE INDEX IF NOT EXISTS idx_superbills_patient_id ON public.superbills(patient_id);
CREATE INDEX IF NOT EXISTS idx_superbills_appointment_id ON public.superbills(appointment_id);

ALTER TABLE public.superbills ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-populate practice_id from doctor
CREATE OR REPLACE FUNCTION public.set_superbill_practice_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.practice_id IS NULL AND NEW.doctor_id IS NOT NULL THEN
    SELECT d.practice_id INTO NEW.practice_id FROM public.doctors d WHERE d.id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_superbill_practice_id ON public.superbills;
CREATE TRIGGER trg_set_superbill_practice_id
  BEFORE INSERT OR UPDATE ON public.superbills
  FOR EACH ROW EXECUTE FUNCTION public.set_superbill_practice_id();

CREATE OR REPLACE FUNCTION public.touch_superbills_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_superbills_updated_at ON public.superbills;
CREATE TRIGGER trg_touch_superbills_updated_at
  BEFORE UPDATE ON public.superbills
  FOR EACH ROW EXECUTE FUNCTION public.touch_superbills_updated_at();

-- RLS
CREATE POLICY "Doctors manage their superbills"
  ON public.superbills FOR ALL
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Practice admins manage clinic superbills"
  ON public.superbills FOR ALL
  USING (
    practice_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.practices p WHERE p.id = superbills.practice_id AND p.admin_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clinic_staff cs
        WHERE cs.practice_id = superbills.practice_id
          AND cs.user_id = auth.uid()
          AND cs.status = 'active'
          AND COALESCE(cs.can_manage_billing, false) = true
      )
    )
  )
  WITH CHECK (
    practice_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.practices p WHERE p.id = superbills.practice_id AND p.admin_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clinic_staff cs
        WHERE cs.practice_id = superbills.practice_id
          AND cs.user_id = auth.uid()
          AND cs.status = 'active'
          AND COALESCE(cs.can_manage_billing, false) = true
      )
    )
  );

CREATE POLICY "Patients view their superbills"
  ON public.superbills FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Super admins manage all superbills"
  ON public.superbills FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
