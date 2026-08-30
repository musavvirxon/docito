-- =========================================================
-- 1) Tables
-- =========================================================
CREATE TABLE public.doctor_commission_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  doctor_user_id uuid NOT NULL,
  source_payment_key text NOT NULL UNIQUE,
  gross_amount_cents bigint NOT NULL DEFAULT 0,
  percentage_rate numeric NOT NULL DEFAULT 0,
  compensation_profile_id uuid,
  commission_amount_cents bigint NOT NULL DEFAULT 0,
  appointment_id uuid,
  patient_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','voided')),
  accrued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.doctor_commission_accruals TO authenticated;
GRANT ALL ON public.doctor_commission_accruals TO service_role;

ALTER TABLE public.doctor_commission_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors view their own accruals"
  ON public.doctor_commission_accruals FOR SELECT TO authenticated
  USING (doctor_user_id = auth.uid());

CREATE POLICY "Entity admins view accruals"
  ON public.doctor_commission_accruals FOR SELECT TO authenticated
  USING (public.can_access_entity(entity_type, entity_id));

CREATE INDEX idx_dca_entity ON public.doctor_commission_accruals (entity_type, entity_id, doctor_user_id);
CREATE INDEX idx_dca_user ON public.doctor_commission_accruals (doctor_user_id, accrued_at DESC);

CREATE TABLE public.doctor_commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  doctor_user_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.doctor_commission_payouts TO authenticated;
GRANT ALL ON public.doctor_commission_payouts TO service_role;

ALTER TABLE public.doctor_commission_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors view their own payouts"
  ON public.doctor_commission_payouts FOR SELECT TO authenticated
  USING (doctor_user_id = auth.uid());

CREATE POLICY "Entity admins view payouts"
  ON public.doctor_commission_payouts FOR SELECT TO authenticated
  USING (public.can_access_entity(entity_type, entity_id));

CREATE POLICY "Entity admins record payouts"
  ON public.doctor_commission_payouts FOR INSERT TO authenticated
  WITH CHECK (public.can_access_entity(entity_type, entity_id) AND paid_by = auth.uid());

CREATE INDEX idx_dcp_entity ON public.doctor_commission_payouts (entity_type, entity_id, doctor_user_id);
CREATE INDEX idx_dcp_user ON public.doctor_commission_payouts (doctor_user_id, paid_at DESC);

-- =========================================================
-- 2) Accrual engine
-- =========================================================
CREATE OR REPLACE FUNCTION public.accrue_doctor_commission(
  p_source_key text,
  p_doctor_id uuid,
  p_gross_cents bigint,
  p_at timestamptz,
  p_appointment_id uuid,
  p_patient_id uuid,
  p_collected boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_practice_id uuid;
  v_profile record;
BEGIN
  IF p_source_key IS NULL THEN
    RETURN;
  END IF;

  IF NOT p_collected THEN
    UPDATE public.doctor_commission_accruals
      SET status = 'voided'
      WHERE source_payment_key = p_source_key AND status <> 'voided';
    RETURN;
  END IF;

  -- Already accrued: just make sure it is active again.
  IF EXISTS (SELECT 1 FROM public.doctor_commission_accruals WHERE source_payment_key = p_source_key) THEN
    UPDATE public.doctor_commission_accruals
      SET status = 'active'
      WHERE source_payment_key = p_source_key AND status <> 'active';
    RETURN;
  END IF;

  IF p_doctor_id IS NULL OR COALESCE(p_gross_cents, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT user_id, practice_id INTO v_user_id, v_practice_id
  FROM public.doctors WHERE id = p_doctor_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_profile
  FROM public.staff_compensation_profiles
  WHERE user_id = v_user_id
    AND compensation_type = 'percentage'
    AND percentage_of = 'doctor_revenue'
    AND is_active = true
    AND effective_from <= COALESCE(p_at, now())::date
  ORDER BY effective_from DESC, created_at DESC
  LIMIT 1;

  IF v_profile.id IS NULL OR COALESCE(v_profile.percentage_rate, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.doctor_commission_accruals (
    entity_type, entity_id, doctor_user_id, source_payment_key,
    gross_amount_cents, percentage_rate, compensation_profile_id,
    commission_amount_cents, appointment_id, patient_id, status, accrued_at
  ) VALUES (
    COALESCE(v_profile.entity_type, 'practice'),
    COALESCE(v_profile.entity_id, v_practice_id),
    v_user_id,
    p_source_key,
    p_gross_cents,
    v_profile.percentage_rate,
    v_profile.id,
    ROUND(p_gross_cents * v_profile.percentage_rate / 100.0),
    p_appointment_id,
    p_patient_id,
    'active',
    COALESCE(p_at, now())
  )
  ON CONFLICT (source_payment_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_accrue_commission_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collected boolean;
BEGIN
  v_collected := lower(COALESCE(NEW.status, '')) IN ('paid','completed','succeeded','partial');
  PERFORM public.accrue_doctor_commission(
    'payment:' || NEW.id::text,
    NEW.doctor_id,
    ROUND(COALESCE(NEW.amount, 0) * 100)::bigint,
    COALESCE(NEW.paid_at, NEW.created_at),
    NEW.appointment_id,
    NEW.patient_id,
    v_collected
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_accrue_commission_billing_tx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collected boolean;
BEGIN
  v_collected := COALESCE(NEW.transaction_type, '') = 'payment'
    AND lower(COALESCE(NEW.status, '')) NOT IN ('refunded','failed','voided','canceled','cancelled');

  IF COALESCE(NEW.transaction_type, '') <> 'payment' THEN
    RETURN NEW;
  END IF;

  PERFORM public.accrue_doctor_commission(
    'ledger:' || NEW.id::text,
    NEW.doctor_id,
    COALESCE(NEW.amount_cents, ROUND(COALESCE(NEW.amount, 0) * 100))::bigint,
    NEW.created_at,
    NEW.appointment_id,
    NEW.patient_id,
    v_collected
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accrue_commission_on_payment ON public.payments;
CREATE TRIGGER accrue_commission_on_payment
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.trg_accrue_commission_payments();

DROP TRIGGER IF EXISTS accrue_commission_on_billing_tx ON public.billing_transactions;
CREATE TRIGGER accrue_commission_on_billing_tx
AFTER INSERT OR UPDATE ON public.billing_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_accrue_commission_billing_tx();

-- =========================================================
-- 3) Backfill existing collected payments
-- =========================================================
DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, doctor_id, amount, paid_at, created_at, appointment_id, patient_id
    FROM public.payments
    WHERE lower(COALESCE(status, '')) IN ('paid','completed','succeeded','partial')
      AND doctor_id IS NOT NULL
  LOOP
    PERFORM public.accrue_doctor_commission(
      'payment:' || r.id::text, r.doctor_id,
      ROUND(COALESCE(r.amount, 0) * 100)::bigint,
      COALESCE(r.paid_at, r.created_at), r.appointment_id, r.patient_id, true);
  END LOOP;

  FOR r IN
    SELECT id, doctor_id, amount, amount_cents, created_at, appointment_id, patient_id
    FROM public.billing_transactions
    WHERE transaction_type = 'payment'
      AND lower(COALESCE(status, '')) NOT IN ('refunded','failed','voided','canceled','cancelled')
      AND doctor_id IS NOT NULL
  LOOP
    PERFORM public.accrue_doctor_commission(
      'ledger:' || r.id::text, r.doctor_id,
      COALESCE(r.amount_cents, ROUND(COALESCE(r.amount, 0) * 100))::bigint,
      r.created_at, r.appointment_id, r.patient_id, true);
  END LOOP;
END;
$backfill$;

-- =========================================================
-- 4) Doctor submissions: rent only
-- =========================================================
ALTER TABLE public.doctor_payment_submissions
  DROP CONSTRAINT IF EXISTS doctor_payment_submissions_payment_type_check;

ALTER TABLE public.doctor_payment_submissions
  ADD CONSTRAINT doctor_payment_submissions_payment_type_check
  CHECK (payment_type IN ('rent_payment')) NOT VALID;