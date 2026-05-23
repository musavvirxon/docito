
-- 1. Extend billing_invoices with linkage metadata for real billing flows
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS patient_id uuid,
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_billing_invoices_patient_id ON public.billing_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_doctor_id ON public.billing_invoices(doctor_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_appointment_id ON public.billing_invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_entity ON public.billing_invoices(entity_type, entity_id);

-- 2. Link payments to invoices so a payment can update its invoice's balance
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_due numeric;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- 3. Relax payment status to accept 'partial' (no CHECK exists today; document intent)
-- Status values used: pending, partial, paid, refunded, failed.

-- 4. Trigger: when a payment is inserted/updated, sync the linked invoice totals
CREATE OR REPLACE FUNCTION public.sync_invoice_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_paid_cents integer;
  v_due_cents integer;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(ROUND(amount * 100)), 0)::integer INTO v_paid_cents
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'succeeded', 'partial');

  SELECT amount_due_cents INTO v_due_cents
  FROM public.billing_invoices
  WHERE id = NEW.invoice_id;

  v_due_cents := COALESCE(v_due_cents, 0);

  UPDATE public.billing_invoices
  SET amount_paid_cents = v_paid_cents,
      amount_remaining_cents = GREATEST(v_due_cents - v_paid_cents, 0),
      status = CASE
        WHEN v_paid_cents <= 0 THEN 'pending'
        WHEN v_paid_cents >= v_due_cents THEN 'paid'
        ELSE 'partial'
      END,
      paid_at = CASE
        WHEN v_paid_cents >= v_due_cents THEN COALESCE(paid_at, now())
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_from_payment ON public.payments;
CREATE TRIGGER trg_sync_invoice_from_payment
AFTER INSERT OR UPDATE OF amount, status, invoice_id
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_from_payment();

-- 5. RLS policies on billing_invoices: clinic admin, billing staff, doctor, patient
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Practice admin / billing staff full management for their practice
DROP POLICY IF EXISTS "Practice admin manage practice invoices" ON public.billing_invoices;
CREATE POLICY "Practice admin manage practice invoices"
  ON public.billing_invoices FOR ALL
  USING (
    entity_type IN ('practice','clinic') AND (
      EXISTS (SELECT 1 FROM public.practices p WHERE p.id = billing_invoices.entity_id AND p.admin_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clinic_staff cs
        WHERE cs.practice_id = billing_invoices.entity_id
          AND cs.user_id = auth.uid()
          AND cs.status = 'active'
          AND COALESCE(cs.can_manage_billing, false) = true
      )
    )
  )
  WITH CHECK (
    entity_type IN ('practice','clinic') AND (
      EXISTS (SELECT 1 FROM public.practices p WHERE p.id = billing_invoices.entity_id AND p.admin_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.clinic_staff cs
        WHERE cs.practice_id = billing_invoices.entity_id
          AND cs.user_id = auth.uid()
          AND cs.status = 'active'
          AND COALESCE(cs.can_manage_billing, false) = true
      )
    )
  );

-- Doctors can manage invoices for their own patients (independent or as part of a clinic)
DROP POLICY IF EXISTS "Doctors manage their invoices" ON public.billing_invoices;
CREATE POLICY "Doctors manage their invoices"
  ON public.billing_invoices FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR (entity_type = 'doctor' AND entity_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR (entity_type = 'doctor' AND entity_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  );

-- Patients see their own invoices
DROP POLICY IF EXISTS "Patients view their invoices" ON public.billing_invoices;
CREATE POLICY "Patients view their invoices"
  ON public.billing_invoices FOR SELECT
  USING (patient_id = auth.uid() OR (entity_type = 'user' AND entity_id = auth.uid()));

-- Super admin oversight
DROP POLICY IF EXISTS "Super admin manage invoices" ON public.billing_invoices;
CREATE POLICY "Super admin manage invoices"
  ON public.billing_invoices FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 6. Helpful invoice number generator (used by app code as fallback)
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v text;
BEGIN
  v := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*9000)+1000)::int::text, 4, '0');
  RETURN v;
END;
$$;
