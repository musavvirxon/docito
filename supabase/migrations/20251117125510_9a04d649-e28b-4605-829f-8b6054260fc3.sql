-- Update clinic plans with new names and details
DELETE FROM subscription_plans WHERE target_audience = 'practice';

-- Insert updated clinic plans
INSERT INTO subscription_plans (
  name, 
  plan_code,
  description, 
  price, 
  billing_interval, 
  target_audience, 
  features, 
  is_active
) VALUES
-- Starter Plan (Clinic) - Monthly
(
  'Starter',
  'practice_starter_monthly',
  'Suitable for small clinics with multiple practitioners',
  19900,
  'monthly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 1,000 patient records',
      'Access for up to 5 doctors',
      'Basic appointment and procedure tracking',
      'Secure data backup',
      'Email support'
    ),
    'maxRecords', 1000,
    'maxDoctors', 5,
    'storageGB', 20
  ),
  true
),
-- Starter Plan (Clinic) - Yearly
(
  'Starter',
  'practice_starter_yearly',
  'Suitable for small clinics with multiple practitioners',
  17910,
  'yearly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 1,000 patient records',
      'Access for up to 5 doctors',
      'Basic appointment and procedure tracking',
      'Secure data backup',
      'Email support'
    ),
    'maxRecords', 1000,
    'maxDoctors', 5,
    'storageGB', 20
  ),
  true
),
-- Growth Plan (Clinic) - Monthly
(
  'Growth',
  'practice_growth_monthly',
  'Perfect for medium-sized clinics needing operational insights',
  39900,
  'monthly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 5,000 patient records',
      'Access for up to 20 doctors',
      'Advanced reporting and analytics',
      'Priority technical support',
      'Staff role management',
      'Automated invoicing'
    ),
    'maxRecords', 5000,
    'maxDoctors', 20,
    'storageGB', 200
  ),
  true
),
-- Growth Plan (Clinic) - Yearly
(
  'Growth',
  'practice_growth_yearly',
  'Perfect for medium-sized clinics needing operational insights',
  35910,
  'yearly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 5,000 patient records',
      'Access for up to 20 doctors',
      'Advanced reporting and analytics',
      'Priority technical support',
      'Staff role management',
      'Automated invoicing'
    ),
    'maxRecords', 5000,
    'maxDoctors', 20,
    'storageGB', 200
  ),
  true
),
-- Enterprise Plan (Clinic) - Monthly
(
  'Enterprise',
  'practice_enterprise_monthly',
  'Designed for large hospitals and multi-specialty centers',
  69900,
  'monthly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Unlimited patient records',
      'Unlimited doctor accounts',
      'Full procedure management & analytics suite',
      'Custom integrations and premium support',
      'Dedicated account manager',
      'AI-powered insights'
    ),
    'maxRecords', 'unlimited',
    'maxDoctors', 'unlimited',
    'storageGB', 1000
  ),
  true
),
-- Enterprise Plan (Clinic) - Yearly
(
  'Enterprise',
  'practice_enterprise_yearly',
  'Designed for large hospitals and multi-specialty centers',
  62910,
  'yearly',
  'practice',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Unlimited patient records',
      'Unlimited doctor accounts',
      'Full procedure management & analytics suite',
      'Custom integrations and premium support',
      'Dedicated account manager',
      'AI-powered insights'
    ),
    'maxRecords', 'unlimited',
    'maxDoctors', 'unlimited',
    'storageGB', 1000
  ),
  true
);