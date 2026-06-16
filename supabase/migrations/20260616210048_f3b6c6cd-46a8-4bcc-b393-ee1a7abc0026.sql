
-- 1) Entity base currencies
ALTER TABLE public.practices ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.doctors   ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.payments  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.staff_compensation_profiles ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- 2) finance_entries.source for auto-rows
ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_session_unique
  ON public.finance_entries (entity_type, entity_id, reference)
  WHERE source = 'appointment_session';

-- 3) Trigger: appointment_sessions completed -> finance_entries
CREATE OR REPLACE FUNCTION public.fn_session_to_finance_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt        RECORD;
  v_amount_cts  integer := 0;
  v_practice_cur text := 'USD';
  v_doctor_cur   text := 'USD';
  v_already_paid numeric := 0;
  v_remaining_cts integer := 0;
BEGIN
  -- Only fire when a session transitions to ended/completed
  IF NEW.ended_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.ended_at IS NOT NULL THEN
    RETURN NEW; -- already processed
  END IF;

  SELECT a.id, a.practice_id, a.doctor_id, a.patient_id,
         COALESCE(p.price, p.default_cost, d.consultation_fee, 0) AS unit_price
  INTO v_appt
  FROM appointments a
  LEFT JOIN procedures p ON p.id = a.procedure_id
  LEFT JOIN doctors d    ON d.id = a.doctor_id
  WHERE a.id = NEW.appointment_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Sum payments already recorded for this appointment
  SELECT COALESCE(SUM(amount), 0) INTO v_already_paid
  FROM payments
  WHERE appointment_id = v_appt.id AND status IN ('completed','paid');

  v_amount_cts := FLOOR(GREATEST(0, COALESCE(v_appt.unit_price, 0) - v_already_paid) * 100)::int;
  IF v_amount_cts <= 0 THEN RETURN NEW; END IF;

  -- Currencies (fall back to USD)
  SELECT COALESCE(currency,'USD') INTO v_practice_cur FROM practices WHERE id = v_appt.practice_id;
  SELECT COALESCE(currency,'USD') INTO v_doctor_cur   FROM doctors   WHERE id = v_appt.doctor_id;

  IF v_appt.practice_id IS NOT NULL THEN
    INSERT INTO finance_entries
      (entity_type, entity_id, entry_type, amount_cents, currency, occurred_at, description, reference, source, metadata)
    VALUES
      ('practice', v_appt.practice_id, 'income', v_amount_cts, COALESCE(v_practice_cur,'USD'),
       NEW.ended_at, 'Appointment session', v_appt.id::text, 'appointment_session',
       jsonb_build_object('session_id', NEW.id, 'doctor_id', v_appt.doctor_id, 'patient_id', v_appt.patient_id))
    ON CONFLICT (entity_type, entity_id, reference) WHERE source = 'appointment_session' DO NOTHING;
  END IF;

  IF v_appt.doctor_id IS NOT NULL THEN
    INSERT INTO finance_entries
      (entity_type, entity_id, entry_type, amount_cents, currency, occurred_at, description, reference, source, metadata)
    VALUES
      ('doctor', v_appt.doctor_id, 'income', v_amount_cts, COALESCE(v_doctor_cur,'USD'),
       NEW.ended_at, 'Appointment session', v_appt.id::text, 'appointment_session',
       jsonb_build_object('session_id', NEW.id, 'practice_id', v_appt.practice_id, 'patient_id', v_appt.patient_id))
    ON CONFLICT (entity_type, entity_id, reference) WHERE source = 'appointment_session' DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_to_finance_entry ON public.appointment_sessions;
CREATE TRIGGER trg_session_to_finance_entry
AFTER INSERT OR UPDATE OF ended_at ON public.appointment_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_session_to_finance_entry();
