
-- Compensation profiles: salary, hourly, or percentage-based pay for staff/doctors
CREATE TABLE public.staff_compensation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('practice','clinic','lab','pharmacy','imaging')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('salary','hourly','percentage')),
  salary_amount_cents BIGINT DEFAULT NULL,
  salary_period TEXT DEFAULT NULL CHECK (salary_period IS NULL OR salary_period IN ('monthly','weekly','daily')),
  hourly_rate_cents BIGINT DEFAULT NULL,
  percentage_rate NUMERIC(5,2) DEFAULT NULL CHECK (percentage_rate IS NULL OR (percentage_rate >= 0 AND percentage_rate <= 100)),
  percentage_of TEXT DEFAULT NULL CHECK (percentage_of IS NULL OR percentage_of IN ('doctor_revenue','appointment_fee','procedure_fee')),
  payout_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payout_frequency IN ('monthly','weekly','daily','each_time')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Payout ledger: tracks calculated/approved/paid payouts
CREATE TABLE public.compensation_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compensation_profile_id UUID NOT NULL REFERENCES public.staff_compensation_profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calculated_amount_cents BIGINT NOT NULL DEFAULT 0,
  adjustments_cents BIGINT NOT NULL DEFAULT 0,
  final_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_compensation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensation_payouts ENABLE ROW LEVEL SECURITY;

-- Policies for staff_compensation_profiles
CREATE POLICY "Entity admins can manage compensation profiles"
  ON public.staff_compensation_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = staff_compensation_profiles.entity_id
        AND p.admin_id = auth.uid()
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can view their own compensation"
  ON public.staff_compensation_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Policies for compensation_payouts
CREATE POLICY "Entity admins can manage payouts"
  ON public.compensation_payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = compensation_payouts.entity_id
        AND p.admin_id = auth.uid()
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can view their own payouts"
  ON public.compensation_payouts FOR SELECT
  USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_comp_profiles_entity ON public.staff_compensation_profiles (entity_type, entity_id);
CREATE INDEX idx_comp_profiles_user ON public.staff_compensation_profiles (user_id);
CREATE INDEX idx_comp_payouts_profile ON public.compensation_payouts (compensation_profile_id);
CREATE INDEX idx_comp_payouts_user ON public.compensation_payouts (user_id, status);
CREATE INDEX idx_comp_payouts_entity ON public.compensation_payouts (entity_type, entity_id, status);
