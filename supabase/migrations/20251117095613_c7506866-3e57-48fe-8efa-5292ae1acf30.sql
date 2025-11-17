-- ============================================================
--  DOCITO PAYMENT SYSTEM EXTENSION
--  Extends existing schema with subscription & payment features
-- ============================================================

---------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    billing_interval TEXT CHECK (billing_interval IN ('monthly','yearly')) NOT NULL,
    target_audience TEXT CHECK (target_audience IN ('patient','practice','doctor')) NOT NULL,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id TEXT,
    stripe_product_id TEXT,
    trial_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX subscription_plans_target_idx ON public.subscription_plans (target_audience);
CREATE INDEX subscription_plans_active_idx ON public.subscription_plans (is_active);

---------------------------------------------------------------
-- 2. USER SUBSCRIPTIONS
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status TEXT CHECK (status IN ('active','past_due','canceled','incomplete','trialing','unpaid')) NOT NULL DEFAULT 'incomplete',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX user_subscriptions_user_idx ON public.user_subscriptions (user_id);
CREATE INDEX user_subscriptions_status_idx ON public.user_subscriptions (status);
CREATE INDEX user_subscriptions_stripe_idx ON public.user_subscriptions (stripe_subscription_id);

---------------------------------------------------------------
-- 3. PAYMENT INTENTS (Stripe Integration)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('requires_payment_method','requires_confirmation','requires_action','processing','succeeded','canceled','failed')) NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('subscription','appointment','verification','one_time')) NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_client_secret TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX payment_intents_user_idx ON public.payment_intents (user_id);
CREATE INDEX payment_intents_stripe_idx ON public.payment_intents (stripe_payment_intent_id);
CREATE INDEX payment_intents_status_idx ON public.payment_intents (status);

---------------------------------------------------------------
-- 4. TRANSACTIONS (Unified Transaction Ledger)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    transaction_type TEXT CHECK (transaction_type IN ('subscription','appointment','clinic_verification','doctor_verification','one_time','refund')) NOT NULL,
    status TEXT CHECK (status IN ('pending','completed','failed','refunded','disputed')) NOT NULL DEFAULT 'pending',
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    refund_reason TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX transactions_user_idx ON public.transactions (user_id);
CREATE INDEX transactions_type_idx ON public.transactions (transaction_type);
CREATE INDEX transactions_status_idx ON public.transactions (status);
CREATE INDEX transactions_created_idx ON public.transactions (created_at DESC);

---------------------------------------------------------------
-- 5. INVOICES
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    tax_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    status TEXT CHECK (status IN ('draft','open','paid','void','uncollectible')) NOT NULL DEFAULT 'draft',
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    stripe_invoice_id TEXT UNIQUE,
    line_items JSONB DEFAULT '[]',
    billing_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX invoices_user_idx ON public.invoices (user_id);
CREATE INDEX invoices_status_idx ON public.invoices (status);
CREATE INDEX invoices_number_idx ON public.invoices (invoice_number);

---------------------------------------------------------------
-- 6. WEBHOOK LOGS (Stripe Events)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX webhook_logs_event_type_idx ON public.webhook_logs (event_type);
CREATE INDEX webhook_logs_processed_idx ON public.webhook_logs (processed);
CREATE INDEX webhook_logs_created_idx ON public.webhook_logs (created_at DESC);

---------------------------------------------------------------
-- 7. PRACTICE VERIFICATION PAYMENTS
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_verification_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('pending','paid','failed','refunded')) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX practice_verification_payments_practice_idx ON public.practice_verification_payments (practice_id);

---------------------------------------------------------------
-- 8. DOCTOR VERIFICATION PAYMENTS
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_verification_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('pending','paid','failed','refunded')) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX doctor_verification_payments_doctor_idx ON public.doctor_verification_payments (doctor_id);

---------------------------------------------------------------
-- 9. PAYMENT METHODS (Stored Cards)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('card','bank_account')) NOT NULL,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    billing_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX payment_methods_user_idx ON public.payment_methods (user_id);
CREATE INDEX payment_methods_default_idx ON public.payment_methods (user_id, is_default);

---------------------------------------------------------------
-- 10. FUNCTIONS
---------------------------------------------------------------

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    invoice_num TEXT;
    counter INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO counter
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    invoice_num := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(counter::TEXT, 5, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------------
-- 11. RLS POLICIES
---------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_verification_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_verification_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Anyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Subscription Plans: Super admins can manage
CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- User Subscriptions: Users can view their own
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions FOR SELECT
USING (user_id = auth.uid());

-- User Subscriptions: System can create/update
CREATE POLICY "System can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- Payment Intents: Users can view their own
CREATE POLICY "Users can view their own payment intents"
ON public.payment_intents FOR SELECT
USING (user_id = auth.uid());

-- Payment Intents: System can manage
CREATE POLICY "System can manage payment intents"
ON public.payment_intents FOR ALL
USING (true)
WITH CHECK (true);

-- Transactions: Users can view their own
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (user_id = auth.uid());

-- Transactions: Super admins can view all
CREATE POLICY "Super admins can view all transactions"
ON public.transactions FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Invoices: Users can view their own
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
USING (user_id = auth.uid());

-- Invoices: Super admins can view all
CREATE POLICY "Super admins can view all invoices"
ON public.invoices FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Webhook Logs: Only super admins
CREATE POLICY "Super admins can view webhook logs"
ON public.webhook_logs FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Practice Verification Payments: Practice admins can view
CREATE POLICY "Practice admins can view their verification payments"
ON public.practice_verification_payments FOR SELECT
USING (practice_id IN (SELECT id FROM public.practices WHERE admin_id = auth.uid()));

-- Doctor Verification Payments: Doctors can view their own
CREATE POLICY "Doctors can view their verification payments"
ON public.doctor_verification_payments FOR SELECT
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- Payment Methods: Users can manage their own
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods FOR DELETE
USING (user_id = auth.uid());

---------------------------------------------------------------
-- 12. INSERT DEFAULT SUBSCRIPTION PLANS
---------------------------------------------------------------

INSERT INTO public.subscription_plans (plan_code, name, description, price, billing_interval, target_audience, features) VALUES
-- Patient Plans
('patient_basic_monthly', 'Basic Patient Plan', 'Essential healthcare access', 999, 'monthly', 'patient', 
 '{"appointments": "3 per month", "features": ["Online consultations", "Medical records access", "Prescription management"]}'::jsonb),
('patient_premium_monthly', 'Premium Patient Plan', 'Comprehensive healthcare', 1999, 'monthly', 'patient',
 '{"appointments": "Unlimited", "features": ["Priority booking", "24/7 support", "Health monitoring", "Specialist consultations"]}'::jsonb),
('patient_basic_yearly', 'Basic Patient Plan (Annual)', 'Essential healthcare access', 9990, 'yearly', 'patient',
 '{"appointments": "3 per month", "discount": "17%", "features": ["Online consultations", "Medical records access", "Prescription management"]}'::jsonb),
('patient_premium_yearly', 'Premium Patient Plan (Annual)', 'Comprehensive healthcare', 19990, 'yearly', 'patient',
 '{"appointments": "Unlimited", "discount": "17%", "features": ["Priority booking", "24/7 support", "Health monitoring", "Specialist consultations"]}'::jsonb),

-- Practice Plans
('practice_starter_monthly', 'Starter Practice Plan', 'For small clinics', 9900, 'monthly', 'practice',
 '{"doctors": "Up to 5", "features": ["Patient management", "Appointment scheduling", "Basic analytics"]}'::jsonb),
('practice_professional_monthly', 'Professional Practice Plan', 'For growing practices', 24900, 'monthly', 'practice',
 '{"doctors": "Up to 20", "features": ["Advanced analytics", "Multi-location support", "Staff management", "Marketing tools"]}'::jsonb),
('practice_enterprise_monthly', 'Enterprise Practice Plan', 'For large healthcare networks', 49900, 'monthly', 'practice',
 '{"doctors": "Unlimited", "features": ["Custom integrations", "Dedicated support", "White-label options", "API access"]}'::jsonb),

-- Doctor Plans
('doctor_individual_monthly', 'Individual Doctor Plan', 'For independent practitioners', 4900, 'monthly', 'doctor',
 '{"patients": "Up to 100", "features": ["Online consultations", "Schedule management", "Patient portal"]}'::jsonb)
ON CONFLICT (plan_code) DO NOTHING;