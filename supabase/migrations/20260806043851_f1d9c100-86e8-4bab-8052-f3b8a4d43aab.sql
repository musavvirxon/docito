ALTER TABLE public.billing_transactions DROP CONSTRAINT IF EXISTS billing_transactions_transaction_type_check;
ALTER TABLE public.billing_transactions ADD CONSTRAINT billing_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY['appointment_payment','subscription_payment','refund','hold_capture','hold_release','cancellation_fee','charge','discount','payment','adjustment']));

ALTER TABLE public.billing_transactions DROP CONSTRAINT IF EXISTS billing_transactions_status_check;
ALTER TABLE public.billing_transactions ADD CONSTRAINT billing_transactions_status_check
  CHECK (status = ANY (ARRAY['pending','processing','completed','failed','refunded','applied','paid','cancelled','void']));

-- 1) Auto-bill dental (tooth) procedures
CREATE OR REPLACE FUNCTION public.autobill_tooth_procedure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practice uuid;
  v_patient uuid;
  v_doctor_user uuid;
  v_currency text;
  v_desc text;
  v_teeth text;
  v_existing uuid;
BEGIN
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.practice_id, a.patient_id INTO v_practice, v_patient
  FROM public.appointments a WHERE a.id = NEW.appointment_id;

  v_patient := COALESCE(NEW.patient_id, v_patient);

  SELECT d.user_id INTO v_doctor_user FROM public.doctors d WHERE d.id = NEW.doctor_id;

  v_currency := 'usd';

  SELECT string_agg(x::text, ',' ORDER BY x) INTO v_teeth
  FROM unnest(COALESCE(NEW.tooth_numbers, ARRAY[]::integer[])) AS x;

  v_desc := COALESCE(NEW.procedure_name, 'Procedure')
            || CASE WHEN v_teeth IS NOT NULL AND v_teeth <> '' THEN ' (Teeth ' || v_teeth || ')' ELSE '' END;

  SELECT bt.id INTO v_existing
  FROM public.billing_transactions bt
  WHERE bt.metadata->>'source_id' = NEW.id::text
    AND bt.transaction_type = 'charge'
  LIMIT 1;

  IF COALESCE(NEW.cost, 0) <= 0 OR NEW.status::text = 'cancelled' THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.billing_transactions WHERE id = v_existing;
    END IF;
    RETURN NEW;
  END IF;

  IF v_existing IS NOT NULL THEN
    UPDATE public.billing_transactions
    SET amount = ROUND(NEW.cost)::integer,
        amount_cents = ROUND(NEW.cost * 100)::integer,
        description = v_desc,
        patient_id = v_patient,
        practice_id = COALESCE(practice_id, v_practice),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'source', 'appointment_procedure',
          'source_table', 'tooth_procedure_history',
          'source_id', NEW.id::text,
          'procedure_name', NEW.procedure_name,
          'teeth', to_jsonb(COALESCE(NEW.tooth_numbers, ARRAY[]::integer[])),
          'performed_at', COALESCE(NEW.performed_at, NEW.created_at)
        ),
        updated_at = now()
    WHERE id = v_existing;
    RETURN NEW;
  END IF;

  INSERT INTO public.billing_transactions (
    user_id, practice_id, appointment_id, patient_id,
    amount, amount_cents, currency, transaction_type, status,
    description, entity_type, entity_id, metadata
  ) VALUES (
    COALESCE(v_patient, v_doctor_user, NEW.doctor_id),
    v_practice, NEW.appointment_id, v_patient,
    ROUND(NEW.cost)::integer, ROUND(NEW.cost * 100)::integer, v_currency,
    'charge', 'pending', v_desc, 'doctor', NEW.doctor_id,
    jsonb_build_object(
      'source', 'appointment_procedure',
      'source_table', 'tooth_procedure_history',
      'source_id', NEW.id::text,
      'procedure_name', NEW.procedure_name,
      'teeth', to_jsonb(COALESCE(NEW.tooth_numbers, ARRAY[]::integer[])),
      'performed_at', COALESCE(NEW.performed_at, NEW.created_at)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tph_autobill_ins ON public.tooth_procedure_history;
CREATE TRIGGER trg_tph_autobill_ins
AFTER INSERT ON public.tooth_procedure_history
FOR EACH ROW EXECUTE FUNCTION public.autobill_tooth_procedure();

DROP TRIGGER IF EXISTS trg_tph_autobill_upd ON public.tooth_procedure_history;
CREATE TRIGGER trg_tph_autobill_upd
AFTER UPDATE OF cost, procedure_name, tooth_numbers, status ON public.tooth_procedure_history
FOR EACH ROW EXECUTE FUNCTION public.autobill_tooth_procedure();

CREATE OR REPLACE FUNCTION public.autobill_procedure_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.billing_transactions
  WHERE metadata->>'source_id' = OLD.id::text
    AND transaction_type = 'charge';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_tph_autobill_del ON public.tooth_procedure_history;
CREATE TRIGGER trg_tph_autobill_del
AFTER DELETE ON public.tooth_procedure_history
FOR EACH ROW EXECUTE FUNCTION public.autobill_procedure_cleanup();

-- 2) Align the general appointment_procedures auto-bill
CREATE OR REPLACE FUNCTION public.autobill_appointment_procedure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_currency text;
  v_practice uuid;
  v_doctor uuid;
  v_doctor_user uuid;
  v_patient uuid;
  v_desc text;
  v_existing uuid;
BEGIN
  v_price := COALESCE(NEW.estimated_cost, 0);
  IF v_price = 0 AND NEW.procedure_id IS NOT NULL THEN
    SELECT COALESCE(price, default_cost, 0) INTO v_price FROM public.procedures WHERE id = NEW.procedure_id;
  END IF;
  v_currency := lower(COALESCE(NEW.currency, 'usd'));

  SELECT a.practice_id, a.doctor_id, a.patient_id
    INTO v_practice, v_doctor, v_patient
  FROM public.appointments a WHERE a.id = NEW.appointment_id;

  v_patient := COALESCE(NEW.patient_id, v_patient);

  SELECT d.user_id INTO v_doctor_user FROM public.doctors d WHERE d.id = v_doctor;

  IF NEW.procedure_id IS NOT NULL THEN
    SELECT p.name INTO v_desc FROM public.procedures p WHERE p.id = NEW.procedure_id;
  END IF;
  v_desc := COALESCE(v_desc, NULLIF(NEW.procedure_notes, ''), 'Procedure');

  SELECT bt.id INTO v_existing
  FROM public.billing_transactions bt
  WHERE (bt.appointment_procedure_id = NEW.id OR bt.metadata->>'source_id' = NEW.id::text)
    AND bt.transaction_type = 'charge'
  LIMIT 1;

  IF COALESCE(v_price, 0) <= 0 THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.billing_transactions WHERE id = v_existing;
    END IF;
    RETURN NEW;
  END IF;

  IF v_existing IS NOT NULL THEN
    UPDATE public.billing_transactions
    SET amount = ROUND(v_price)::integer,
        amount_cents = ROUND(v_price * 100)::integer,
        description = v_desc,
        patient_id = v_patient,
        practice_id = COALESCE(practice_id, v_practice),
        currency = v_currency,
        updated_at = now()
    WHERE id = v_existing;
    RETURN NEW;
  END IF;

  INSERT INTO public.billing_transactions (
    user_id, practice_id, appointment_id, patient_id,
    amount, amount_cents, currency, transaction_type, status,
    description, appointment_procedure_id, entity_type, entity_id, metadata
  ) VALUES (
    COALESCE(v_patient, v_doctor_user, NEW.prescribed_by),
    v_practice, NEW.appointment_id, v_patient,
    ROUND(v_price)::integer, ROUND(v_price * 100)::integer, v_currency,
    'charge', 'pending', v_desc, NEW.id,
    CASE WHEN v_doctor IS NOT NULL THEN 'doctor' END, v_doctor,
    jsonb_build_object(
      'source', 'appointment_procedure',
      'source_table', 'appointment_procedures',
      'source_id', NEW.id::text,
      'procedure_name', v_desc
    )
  );

  RETURN NEW;
END;
$$;

-- 3) Backfill dental procedure charges
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.id, t.cost FROM public.tooth_procedure_history t
    WHERE t.appointment_id IS NOT NULL
      AND COALESCE(t.cost, 0) > 0
      AND COALESCE(t.status::text, '') <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM public.billing_transactions bt
        WHERE bt.metadata->>'source_id' = t.id::text AND bt.transaction_type = 'charge'
      )
  LOOP
    UPDATE public.tooth_procedure_history SET cost = r.cost WHERE id = r.id;
  END LOOP;
END $$;

-- 4) Backfill general procedure charges
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT ap.id, ap.estimated_cost FROM public.appointment_procedures ap
    WHERE COALESCE(ap.estimated_cost, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.billing_transactions bt
        WHERE (bt.appointment_procedure_id = ap.id OR bt.metadata->>'source_id' = ap.id::text)
          AND bt.transaction_type = 'charge'
      )
  LOOP
    UPDATE public.appointment_procedures SET estimated_cost = r.estimated_cost WHERE id = r.id;
  END LOOP;
END $$;