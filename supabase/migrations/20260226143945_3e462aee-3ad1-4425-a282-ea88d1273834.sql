-- billing_plans
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  interval text NOT NULL DEFAULT 'month',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  is_active boolean NOT NULL DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active billing plans"
  ON public.billing_plans FOR SELECT TO authenticated
  USING (is_active = true);

-- billing_subscriptions
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  plan_id uuid REFERENCES public.billing_plans(id),
  status text NOT NULL DEFAULT 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  provider text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_entity ON public.billing_subscriptions (entity_type, entity_id);

CREATE POLICY "Entity staff can view their subscription"
  ON public.billing_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = billing_subscriptions.entity_type
      AND s.entity_id::uuid = billing_subscriptions.entity_id
  ));