CREATE OR REPLACE FUNCTION public.record_billing_payment(
  p_amount_cents integer,
  p_method text DEFAULT 'cash'::text,
  p_notes text DEFAULT NULL::text,
  p_appointment_id uuid DEFAULT NULL::uuid,
  p_patient_id uuid DEFAULT NULL::uuid,
  p_doctor_id uuid DEFAULT NULL::uuid,
  p_practice_id uuid DEFAULT NULL::uuid,
  p_charge_id uuid DEFAULT NULL::uuid,
  p_discount_cents integer DEFAULT 0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_charge public.billing_transactions%ROWTYPE;
  v_appointment_id uuid := p_appointment_id;
  v_patient_id uuid := p_patient_id;
  v_doctor_id uuid := p_doctor_id;
  v_practice_id uuid := p_practice_id;
  v_currency text := 'uzs';
  v_remaining bigint;
  v_discount_left bigint;
  v_apply bigint;
  v_apply_cash bigint;
  v_apply_disc bigint;
  v_alloc jsonb := '[]'::jsonb;
  v_row record;
  v_profile uuid;
  v_payment_id uuid;
  v_now timestamptz := now();
  v_entity_type text;
  v_entity_id uuid;
  v_discount bigint := GREATEST(COALESCE(p_discount_cents, 0), 0);
BEGIN
  IF COALESCE(p_amount_cents, 0) < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  IF COALESCE(p_amount_cents, 0) = 0 AND v_discount = 0 THEN
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

  v_remaining := COALESCE(p_amount_cents, 0)::bigint;
  v_discount_left := v_discount;

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
    ORDER BY COALESCE(NULLIF(metadata->>'performed_at','')::timestamptz, created_at) ASC, created_at ASC, id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0 AND v_discount_left <= 0;
    v_apply := LEAST(v_remaining + v_discount_left, v_row.total - v_row.paid_cents);
    IF v_apply > 0 THEN
      v_apply_disc := LEAST(v_discount_left, v_apply);
      v_apply_cash := v_apply - v_apply_disc;

      UPDATE public.billing_transactions
      SET paid_cents = paid_cents + v_apply::int,
          status = CASE WHEN paid_cents + v_apply >= v_row.total THEN 'paid' ELSE 'pending' END,
          updated_at = v_now
      WHERE id = v_row.id;

      v_alloc := v_alloc || jsonb_build_object(
        'charge_id', v_row.id,
        'description', v_row.description,
        'amount_cents', v_apply_cash,
        'discount_cents', v_apply_disc
      );
      v_currency := COALESCE(v_row.currency, v_currency);
      v_remaining := v_remaining - v_apply_cash;
      v_discount_left := v_discount_left - v_apply_disc;
    END IF;
  END LOOP;

  -- Discount ledger row (only the portion actually applied)
  IF v_discount - v_discount_left > 0 THEN
    INSERT INTO public.billing_transactions (
      appointment_id, patient_id, user_id, doctor_id, practice_id,
      amount, amount_cents, currency, transaction_type, status, description, metadata
    ) VALUES (
      v_appointment_id, v_patient_id, COALESCE(v_patient_id, auth.uid()), v_doctor_id, v_practice_id,
      ROUND((v_discount - v_discount_left)::numeric / 100)::int, (v_discount - v_discount_left)::int,
      lower(v_currency), 'discount', 'applied',
      COALESCE(NULLIF(p_notes, ''), 'Discount'),
      jsonb_build_object('source','payment_dialog','applied_at',v_now,'allocations',v_alloc)
    );
  END IF;

  -- Record the payment itself (cash portion actually collected)
  IF COALESCE(p_amount_cents, 0) > 0 THEN
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
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'allocations', v_alloc,
    'unallocated_cents', v_remaining,
    'unapplied_discount_cents', v_discount_left
  );
END
$function$;

GRANT EXECUTE ON FUNCTION public.record_billing_payment(integer, text, text, uuid, uuid, uuid, uuid, uuid, integer) TO authenticated;