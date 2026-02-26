-- ===== 1. facility_patients =====
CREATE TABLE IF NOT EXISTS public.facility_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_type text NOT NULL,
  facility_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  address text,
  id_number text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facility_patients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_facility_patients_facility ON public.facility_patients (facility_type, facility_id);

CREATE POLICY "Entity staff can manage facility patients"
  ON public.facility_patients FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = facility_patients.facility_type
      AND s.entity_id::uuid = facility_patients.facility_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = facility_patients.facility_type
      AND s.entity_id::uuid = facility_patients.facility_id
  ));

-- ===== 2. Add facility_patient_id to test_orders and referrals =====
ALTER TABLE public.test_orders ADD COLUMN IF NOT EXISTS facility_patient_id uuid REFERENCES public.facility_patients(id);
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS facility_patient_id uuid REFERENCES public.facility_patients(id);

-- ===== 3. lab_samples =====
CREATE TABLE IF NOT EXISTS public.lab_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_center_id uuid NOT NULL,
  test_order_id uuid REFERENCES public.test_orders(id),
  sample_type text NOT NULL DEFAULT 'blood',
  barcode text,
  patient_id uuid,
  facility_patient_id uuid REFERENCES public.facility_patients(id),
  patient_name text,
  collected_at timestamptz,
  collected_by uuid,
  status text NOT NULL DEFAULT 'pending',
  storage_location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_samples ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lab_samples_center ON public.lab_samples (lab_center_id);

CREATE POLICY "Lab staff can manage samples"
  ON public.lab_samples FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = 'lab' AND s.entity_id::uuid = lab_samples.lab_center_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = 'lab' AND s.entity_id::uuid = lab_samples.lab_center_id
  ));

-- ===== 4. lab_home_collections =====
CREATE TABLE IF NOT EXISTS public.lab_home_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_center_id uuid NOT NULL,
  test_order_id uuid REFERENCES public.test_orders(id),
  patient_id uuid,
  facility_patient_id uuid REFERENCES public.facility_patients(id),
  patient_name text,
  patient_phone text,
  address text NOT NULL,
  preferred_date date,
  preferred_time text,
  assigned_collector uuid,
  status text NOT NULL DEFAULT 'requested',
  notes text,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_home_collections ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lab_home_collections_center ON public.lab_home_collections (lab_center_id);

CREATE POLICY "Lab staff can manage home collections"
  ON public.lab_home_collections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = 'lab' AND s.entity_id::uuid = lab_home_collections.lab_center_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = 'lab' AND s.entity_id::uuid = lab_home_collections.lab_center_id
  ));

-- ===== 5. finance_categories =====
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'expense',
  name text NOT NULL,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_categories_entity ON public.finance_categories (entity_type, entity_id);

CREATE POLICY "Entity staff can manage finance categories"
  ON public.finance_categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_categories.entity_type
      AND s.entity_id::uuid = finance_categories.entity_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_categories.entity_type
      AND s.entity_id::uuid = finance_categories.entity_id
  ));

-- ===== 6. finance_entries =====
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entry_type text NOT NULL DEFAULT 'expense',
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text,
  reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_entries_entity ON public.finance_entries (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_occurred ON public.finance_entries (occurred_at);

CREATE POLICY "Entity staff can manage finance entries"
  ON public.finance_entries FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_entries.entity_type
      AND s.entity_id::uuid = finance_entries.entity_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_entries.entity_type
      AND s.entity_id::uuid = finance_entries.entity_id
  ));

-- ===== 7. finance_budgets =====
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  budget_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, category_id, month_start)
);
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_budgets_entity ON public.finance_budgets (entity_type, entity_id);

CREATE POLICY "Entity staff can manage finance budgets"
  ON public.finance_budgets FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_budgets.entity_type
      AND s.entity_id::uuid = finance_budgets.entity_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_budgets.entity_type
      AND s.entity_id::uuid = finance_budgets.entity_id
  ));

-- ===== 8. finance_recurring_expenses =====
CREATE TABLE IF NOT EXISTS public.finance_recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  description text,
  frequency text NOT NULL DEFAULT 'monthly',
  weekday integer,
  day_of_month integer,
  month_of_year integer,
  autopost boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_posted_at timestamptz,
  next_run_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_recurring_expenses_entity ON public.finance_recurring_expenses (entity_type, entity_id);

CREATE POLICY "Entity staff can manage recurring expenses"
  ON public.finance_recurring_expenses FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_recurring_expenses.entity_type
      AND s.entity_id::uuid = finance_recurring_expenses.entity_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_recurring_expenses.entity_type
      AND s.entity_id::uuid = finance_recurring_expenses.entity_id
  ));

-- ===== 9. finance_recurring_templates =====
CREATE TABLE IF NOT EXISTS public.finance_recurring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  name text NOT NULL,
  entry_type text NOT NULL DEFAULT 'expense',
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  frequency text NOT NULL DEFAULT 'monthly',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_recurring_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_recurring_templates_entity ON public.finance_recurring_templates (entity_type, entity_id);

CREATE POLICY "Entity staff can manage recurring templates"
  ON public.finance_recurring_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_recurring_templates.entity_type
      AND s.entity_id::uuid = finance_recurring_templates.entity_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.get_my_entity_scopes() s
    WHERE s.entity_type = finance_recurring_templates.entity_type
      AND s.entity_id::uuid = finance_recurring_templates.entity_id
  ));