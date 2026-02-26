-- 1. Add entity_type, entity_id, amount_cents to billing_transactions
ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS amount_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_ref text,
  ADD COLUMN IF NOT EXISTS invoice_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Backfill entity columns from practice_id where available
UPDATE public.billing_transactions
SET entity_type = 'practice', entity_id = practice_id, amount_cents = COALESCE(amount, 0)
WHERE practice_id IS NOT NULL AND entity_type IS NULL;

-- 2. Create billing_invoices table
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'usd',
  amount_due_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  amount_remaining_cents integer NOT NULL DEFAULT 0,
  due_at timestamptz,
  paid_at timestamptz,
  hosted_invoice_url text,
  invoice_pdf_url text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- RLS: entity staff can view invoices for their entities via get_my_entity_scopes
CREATE POLICY "Entity staff can view invoices"
  ON public.billing_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.get_my_entity_scopes() s
      WHERE s.entity_type = billing_invoices.entity_type
        AND s.entity_id::uuid = billing_invoices.entity_id
    )
  );

-- RLS for billing_transactions: allow entity staff to view their entity transactions
CREATE POLICY "Entity staff can view entity transactions"
  ON public.billing_transactions
  FOR SELECT
  TO authenticated
  USING (
    entity_type IS NOT NULL AND entity_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.get_my_entity_scopes() s
      WHERE s.entity_type = billing_transactions.entity_type
        AND s.entity_id::uuid = billing_transactions.entity_id
    )
  );

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_billing_invoices_entity ON public.billing_invoices (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_entity ON public.billing_transactions (entity_type, entity_id);