
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_payment_method_id text,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_payment_method_id)
);

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment methods
CREATE POLICY "Users can view own payment methods"
  ON public.user_payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role manages inserts/updates/deletes (edge functions use service client)
CREATE POLICY "Service role full access to payment methods"
  ON public.user_payment_methods FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
