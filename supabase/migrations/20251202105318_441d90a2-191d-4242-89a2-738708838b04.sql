-- Create financial_inputs table to store manually entered financial data
CREATE TABLE IF NOT EXISTS financial_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('doctor', 'practice', 'platform')),
  entity_id UUID NOT NULL,
  
  -- Advertising & Marketing
  ad_cost DECIMAL(12, 2),
  marketing_spend DECIMAL(12, 2),
  
  -- Costs & Expenses
  cogs DECIMAL(12, 2), -- Cost of Goods Sold
  operating_expenses DECIMAL(12, 2),
  interest_expense DECIMAL(12, 2),
  tax_expense DECIMAL(12, 2),
  depreciation_expense DECIMAL(12, 2),
  
  -- Working Capital
  current_assets DECIMAL(12, 2),
  current_liabilities DECIMAL(12, 2),
  
  -- Break-Even Analysis
  fixed_costs DECIMAL(12, 2),
  variable_cost_per_unit DECIMAL(12, 2),
  price_per_unit DECIMAL(12, 2),
  
  -- Customer Metrics
  avg_customer_lifetime_months INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE financial_inputs ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own financial inputs
CREATE POLICY "Doctors can manage their own financial inputs"
ON financial_inputs
FOR ALL
USING (
  entity_type = 'doctor' AND
  entity_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- Practice admins can manage their practice financial inputs
CREATE POLICY "Practice admins can manage their practice financial inputs"
ON financial_inputs
FOR ALL
USING (
  entity_type = 'practice' AND
  entity_id IN (
    SELECT id FROM practices WHERE admin_id = auth.uid()
  )
);

-- Super admins can manage platform financial inputs
CREATE POLICY "Super admins can manage platform financial inputs"
ON financial_inputs
FOR ALL
USING (
  entity_type = 'platform' AND
  has_role(auth.uid(), 'super_admin')
);

-- Super admins can view all financial inputs
CREATE POLICY "Super admins can view all financial inputs"
ON financial_inputs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_financial_inputs_entity ON financial_inputs(entity_type, entity_id);

-- Add trigger for updated_at
CREATE TRIGGER update_financial_inputs_updated_at
  BEFORE UPDATE ON financial_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
