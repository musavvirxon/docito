-- 1) Per-charge settled amount
ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS paid_cents integer NOT NULL DEFAULT 0;

-- 2) Backfill: allocate existing payments FIFO per appointment
DO $backfill$
DECLARE
  appt record;
  remaining bigint;
  chg record;
  apply_amt bigint;
BEGIN
  FOR appt IN
    SELECT DISTINCT appointment_id
    FROM public.billing_transactions
    WHERE appointment_id IS NOT NULL
  LOOP
    SELECT
      COALESCE((SELECT SUM(ROUND(p.amount * 100))::bigint
                FROM public.payments p
                WHERE p.appointment_id = appt.appointment_id
                  AND COALESCE(lower(p.status), '') NOT IN ('refunded','failed')), 0)
      + COALESCE((SELECT SUM(ABS(COALESCE(b.amount_cents, b.amount * 100)))::bigint
                  FROM public.billing_transactions b
                  WHERE b.appointment_id = appt.appointment_id
                    AND b.transaction_type IN ('payment','discount')), 0)
    INTO remaining;

    IF remaining IS NULL OR remaining <= 0 THEN
      CONTINUE;
    END IF;

    FOR chg IN
      SELECT id, COALESCE(amount_cents, amount * 100)::bigint AS total
      FROM public.billing_transactions
      WHERE appointment_id = appt.appointment_id
        AND transaction_type NOT IN ('payment','discount','refund')
      ORDER BY created_at ASC
    LOOP
      EXIT WHEN remaining <= 0;
      apply_amt := LEAST(remaining, GREATEST(chg.total, 0));
      IF apply_amt > 0 THEN
        UPDATE public.billing_transactions
        SET paid_cents = apply_amt::int,
            status = CASE WHEN apply_amt >= chg.total THEN 'paid' ELSE 'pending' END
        WHERE id = chg.id;
        remaining := remaining - apply_amt;
      END IF;
    END LOOP;
  END LOOP;
END
$backfill$;

-- 3) Payment recording with FIFO allocation
CREATE OR REPLACE FUNCTION public.record_billing_payment(
  p_amount_cents integer,
  p_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL,
  p_appointment_id uuid DEFAULT NULL,
  p_patient_id uuid DEFAULT NULL,
  p_doctor_id uuid DEFAULT NULL,
  p_practice_id uuid DEFAULT NULL,
  p_charge_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_charge public.billing_transactions%ROWTYPE;
  v_appointment_id uuid := p_appointment_id;
  v_patient_id uuid := p_patient_id;
  v_doctor_id uuid := p_doctor_id;
  v_practice_id uuid := p_practice_id;
  v_currency text := 'uzs';
  v_remaining bigint;
  v_apply bigint;
  v_alloc jsonb := '[]'::jsonb;
  v_row record;
  v_profile uuid;
  v_payment_id uuid;
  v_now timestamptz := now();
  v_entity_type text;
  v_entity_id uuid;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_charge_id IS NOT NULL THEN
    SELECT * INTO v_charge FROM public.billing_transactions WHERE id = p_charge_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Charge not found';
    END IF;
    v_appointment_id := COALESCE(v_appointment_id, v_charge.appointment_id);
    v_patient_id := COALESCE(v_patient_id, v_charge.patient_id);
    v_doctor_id := COALESCE(v_doctor_id, v_charge.doctor_id);
    v_practice_id := COALESCE(v_practice_id, v_charge.practice_id);
    v_currency := COALESCE(v_charge.currency, v_currency);
  END IF;

  IF v_appointment_id IS NOT NULL THEN
    SELECT COALESCE(v_patient_id, a.patient_id), COALESCE(v_doctor_id, a.doctor_id), COALESCE(v_practice_id, a.practice_id)
    INTO v_patient_id, v_doctor_id, v_practice_id
    FROM public.appointments a WHERE a.id = v_appointment_id;
  END IF;

  IF NOT public.can_manage_patient_billing(v_practice_id, v_appointment_id, v_patient_id) THEN
    RAISE EXCEPTION 'Not authorized to record payments for this patient';
  END IF;

  v_remaining := p_amount_cents::bigint;

  FOR v_row IN
    SELECT id, COALESCE(amount_cents, amount * 100)::bigint AS total, paid_cents, description, currency
    FROM public.billing_transactions
    WHERE transaction_type NOT IN ('payment','discount','refund')
      AND COALESCE(amount_cents, amount * 100) > paid_cents
      AND (
        (p_charge_id IS NOT NULL AND id = p_charge_id)
        OR (p_charge_id IS NULL AND v_appointment_id IS NOT NULL AND appointment_id = v_appointment_id)
        OR (p_charge_id IS NULL AND v_appointment_id IS NULL AND v_patient_id IS NOT NULL AND patient_id = v_patient_id)
      )
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_apply := LEAST(v_remaining, v_row.total - v_row.paid_cents);
    IF v_apply > 0 THEN
      UPDATE public.billing_transactions
      SET paid_cents = paid_cents + v_apply::int,
          status = CASE WHEN paid_cents + v_apply >= v_row.total THEN 'paid' ELSE 'pending' END,
          updated_at = v_now
      WHERE id = v_row.id;

      v_alloc := v_alloc || jsonb_build_object(
        'charge_id', v_row.id,
        'description', v_row.description,
        'amount_cents', v_apply
      );
      v_currency := COALESCE(v_row.currency, v_currency);
      v_remaining := v_remaining - v_apply;
    END IF;
  END LOOP;

  -- Record the payment itself
  IF v_patient_id IS NOT NULL THEN
    SELECT pr.user_id INTO v_profile FROM public.profiles pr WHERE pr.user_id = v_patient_id;
  END IF;

  IF v_profile IS NOT NULL THEN
    INSERT INTO public.payments (
      appointment_id, patient_id, doctor_id, practice_id, amount, currency,
      payment_method, status, notes, paid_at
    ) VALUES (
      v_appointment_id, v_profile, v_doctor_id, v_practice_id,
      p_amount_cents::numeric / 100, upper(v_currency),
      p_method, 'completed', p_notes, v_now
    ) RETURNING id INTO v_payment_id;
  ELSE
    INSERT INTO public.billing_transactions (
      appointment_id, patient_id, user_id, doctor_id, practice_id,
      amount, amount_cents, currency, transaction_type, status, description, metadata
    ) VALUES (
      v_appointment_id, v_patient_id, COALESCE(v_patient_id, auth.uid()), v_doctor_id, v_practice_id,
      ROUND(p_amount_cents::numeric / 100)::int, p_amount_cents, lower(v_currency),
      'payment', 'completed', COALESCE(p_notes, 'Payment received'),
      jsonb_build_object('source','manual','payment_method',p_method,'paid_at',v_now,'allocations',v_alloc)
    ) RETURNING id INTO v_payment_id;
  END IF;

  -- Post income to the finance ledger
  v_entity_type := CASE WHEN v_practice_id IS NOT NULL THEN 'practice' ELSE 'doctor' END;
  v_entity_id := COALESCE(v_practice_id, v_doctor_id);
  IF v_entity_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.finance_entries (
        entity_type, entity_id, entry_type, amount_cents, currency, occurred_at, description, metadata
      ) VALUES (
        v_entity_type, v_entity_id, 'income', p_amount_cents, upper(v_currency), v_now,
        COALESCE(p_notes, 'Payment received'),
        jsonb_build_object(
          'source', jsonb_build_object('table','payments','id',v_payment_id),
          'payment_method', p_method,
          'patient_id', v_patient_id,
          'doctor_id', v_doctor_id,
          'appointment_id', v_appointment_id,
          'allocations', v_alloc
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'allocations', v_alloc,
    'unallocated_cents', v_remaining
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.record_billing_payment(integer, text, text, uuid, uuid, uuid, uuid, uuid) TO authenticated;