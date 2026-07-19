
-- 1) Auto-billing when procedure added
ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS appointment_procedure_id uuid UNIQUE
    REFERENCES public.appointment_procedures(id) ON DELETE CASCADE;

ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS patient_id uuid;

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
BEGIN
  -- Resolve amount
  v_price := COALESCE(NEW.estimated_cost, 0);
  IF v_price = 0 AND NEW.procedure_id IS NOT NULL THEN
    SELECT COALESCE(price, default_cost, 0) INTO v_price FROM public.procedures WHERE id = NEW.procedure_id;
  END IF;
  v_currency := COALESCE(NEW.currency, 'usd');

  SELECT a.practice_id, a.doctor_id, a.patient_id
    INTO v_practice, v_doctor, v_patient
  FROM public.appointments a WHERE a.id = NEW.appointment_id;

  v_patient := COALESCE(NEW.patient_id, v_patient);

  SELECT d.user_id INTO v_doctor_user FROM public.doctors d WHERE d.id = v_doctor;

  SELECT COALESCE(p.name, 'Procedure') INTO v_desc FROM public.procedures p WHERE p.id = NEW.procedure_id;
  v_desc := COALESCE(v_desc, 'Procedure');

  INSERT INTO public.billing_transactions (
    user_id, practice_id, appointment_id, patient_id,
    amount, amount_cents, currency, transaction_type, status,
    description, appointment_procedure_id, metadata
  ) VALUES (
    COALESCE(v_patient, v_doctor_user, NEW.prescribed_by),
    v_practice, NEW.appointment_id, v_patient,
    ROUND(v_price)::integer,
    ROUND(v_price * 100)::integer,
    lower(v_currency),
    'charge',
    'pending',
    v_desc,
    NEW.id,
    jsonb_build_object('source','appointment_procedure','procedure_id', NEW.procedure_id)
  )
  ON CONFLICT (appointment_procedure_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    amount_cents = EXCLUDED.amount_cents,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ap_autobill_ins ON public.appointment_procedures;
CREATE TRIGGER trg_ap_autobill_ins
AFTER INSERT ON public.appointment_procedures
FOR EACH ROW EXECUTE FUNCTION public.autobill_appointment_procedure();

DROP TRIGGER IF EXISTS trg_ap_autobill_upd ON public.appointment_procedures;
CREATE TRIGGER trg_ap_autobill_upd
AFTER UPDATE OF estimated_cost, currency, procedure_id ON public.appointment_procedures
FOR EACH ROW EXECUTE FUNCTION public.autobill_appointment_procedure();

-- 2) Patient outstanding balance view
CREATE OR REPLACE VIEW public.patient_outstanding_balance_v
WITH (security_invoker=on) AS
WITH charges AS (
  SELECT patient_id, lower(currency) AS currency,
         SUM(CASE WHEN transaction_type = 'discount' THEN -1 ELSE 1 END *
             COALESCE(amount_cents, amount*100)) AS charge_cents
  FROM public.billing_transactions
  WHERE patient_id IS NOT NULL AND transaction_type IN ('charge','discount')
  GROUP BY patient_id, lower(currency)
),
paid AS (
  SELECT patient_id, lower(COALESCE(currency,'usd')) AS currency,
         SUM(ROUND(amount * 100)::bigint) AS paid_cents
  FROM public.payments
  WHERE patient_id IS NOT NULL
    AND COALESCE(status,'') NOT IN ('refunded','failed','cancelled')
  GROUP BY patient_id, lower(COALESCE(currency,'usd'))
)
SELECT
  COALESCE(c.patient_id, p.patient_id) AS patient_id,
  COALESCE(c.currency, p.currency) AS currency,
  COALESCE(c.charge_cents, 0) - COALESCE(p.paid_cents, 0) AS outstanding_cents
FROM charges c
FULL OUTER JOIN paid p
  ON p.patient_id = c.patient_id AND p.currency = c.currency;

GRANT SELECT ON public.patient_outstanding_balance_v TO authenticated;
