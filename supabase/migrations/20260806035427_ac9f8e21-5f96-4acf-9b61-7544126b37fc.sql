ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS opening_balance_amount numeric,
  ADD COLUMN IF NOT EXISTS opening_balance_currency text DEFAULT 'uzs',
  ADD COLUMN IF NOT EXISTS opening_balance_date date;

CREATE OR REPLACE VIEW public.patient_ledger_v
WITH (security_invoker=on) AS
SELECT
  ('opening-' || p.id::text) AS entry_id,
  p.id AS patient_id,
  NULL::uuid AS practice_id,
  NULL::uuid AS appointment_id,
  COALESCE(p.opening_balance_date::timestamptz, p.created_at) AS entry_date,
  'opening'::text AS kind,
  'Opening balance'::text AS description,
  ROUND(p.opening_balance_amount * 100)::bigint AS charge_cents,
  0::bigint AS payment_cents,
  lower(COALESCE(p.opening_balance_currency, 'uzs')) AS currency,
  NULL::text AS method
FROM public.profiles p
WHERE p.opening_balance_amount IS NOT NULL AND p.opening_balance_amount <> 0

UNION ALL

SELECT
  bt.id::text AS entry_id,
  bt.patient_id,
  bt.practice_id,
  bt.appointment_id,
  bt.created_at AS entry_date,
  CASE WHEN bt.transaction_type = 'discount' THEN 'discount' ELSE 'charge' END AS kind,
  COALESCE(bt.description, 'Charge') AS description,
  (CASE WHEN bt.transaction_type = 'discount' THEN -1 ELSE 1 END
     * COALESCE(bt.amount_cents, ROUND(bt.amount * 100)))::bigint AS charge_cents,
  0::bigint AS payment_cents,
  lower(COALESCE(bt.currency, 'uzs')) AS currency,
  NULL::text AS method
FROM public.billing_transactions bt
WHERE bt.patient_id IS NOT NULL
  AND COALESCE(bt.transaction_type, 'charge') IN ('charge', 'discount')

UNION ALL

SELECT
  pm.id::text AS entry_id,
  pm.patient_id,
  pm.practice_id,
  pm.appointment_id,
  COALESCE(pm.paid_at, pm.created_at) AS entry_date,
  'payment'::text AS kind,
  COALESCE(pm.notes, 'Payment') AS description,
  0::bigint AS charge_cents,
  ROUND(pm.amount * 100)::bigint AS payment_cents,
  lower(COALESCE(pm.currency, 'uzs')) AS currency,
  pm.payment_method AS method
FROM public.payments pm
WHERE pm.patient_id IS NOT NULL
  AND COALESCE(pm.status, '') NOT IN ('refunded', 'failed', 'cancelled');

GRANT SELECT ON public.patient_ledger_v TO authenticated;

DROP VIEW IF EXISTS public.patient_outstanding_balance_v;
CREATE VIEW public.patient_outstanding_balance_v
WITH (security_invoker=on) AS
SELECT
  l.patient_id,
  l.currency,
  SUM(l.charge_cents - l.payment_cents)::numeric AS outstanding_cents
FROM public.patient_ledger_v l
GROUP BY l.patient_id, l.currency;

GRANT SELECT ON public.patient_outstanding_balance_v TO authenticated;