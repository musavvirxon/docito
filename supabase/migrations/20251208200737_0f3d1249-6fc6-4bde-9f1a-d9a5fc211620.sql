-- Create practice_invitations table for staff invitation system
CREATE TABLE IF NOT EXISTS public.practice_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  invited_user_id UUID,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  role TEXT NOT NULL,
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'awaitingSignup', 'expired', 'revoked')),
  invite_type TEXT NOT NULL DEFAULT 'newUser' CHECK (invite_type IN ('existingUser', 'newUser')),
  invited_by UUID NOT NULL,
  invite_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_holds table for appointment payment holds
CREATE TABLE IF NOT EXISTS public.payment_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'captured', 'released', 'refunded', 'failed')),
  payment_provider TEXT DEFAULT 'stripe',
  provider_payment_id TEXT,
  provider_hold_id TEXT,
  hold_expires_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create billing_transactions table for comprehensive billing
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  practice_id UUID REFERENCES public.practices(id),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  payment_hold_id UUID REFERENCES public.payment_holds(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('appointment_payment', 'subscription_payment', 'refund', 'hold_capture', 'hold_release', 'cancellation_fee')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  description TEXT,
  provider_transaction_id TEXT,
  provider_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on tables
ALTER TABLE public.practice_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for practice_invitations
CREATE POLICY "Practice admins can manage invitations"
ON public.practice_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM practices p WHERE p.id = practice_id AND p.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM doctors d WHERE d.practice_id = practice_id AND d.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can view their own invitations"
ON public.practice_invitations
FOR SELECT
TO authenticated
USING (
  invited_user_id = auth.uid()
  OR email = (SELECT email FROM profiles WHERE user_id = auth.uid())
);

-- RLS policies for payment_holds
CREATE POLICY "Users can view their own payment holds"
ON public.payment_holds
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Practice staff can view practice payment holds"
ON public.payment_holds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.id = appointment_id AND d.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can create their own payment holds"
ON public.payment_holds
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS policies for billing_transactions
CREATE POLICY "Users can view their own transactions"
ON public.billing_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Practice staff can view practice transactions"
ON public.billing_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clinic_staff cs 
    WHERE cs.practice_id = billing_transactions.practice_id 
    AND cs.user_id = auth.uid()
    AND cs.can_manage_billing = true
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_practice_invitations_practice ON public.practice_invitations(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_invitations_email ON public.practice_invitations(email);
CREATE INDEX IF NOT EXISTS idx_practice_invitations_token ON public.practice_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_practice_invitations_status ON public.practice_invitations(status);
CREATE INDEX IF NOT EXISTS idx_payment_holds_user ON public.payment_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_appointment ON public.payment_holds(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_status ON public.payment_holds(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_practice ON public.billing_transactions(practice_id);