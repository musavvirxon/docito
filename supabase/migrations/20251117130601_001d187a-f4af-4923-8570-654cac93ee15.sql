-- Delete existing doctor plans
DELETE FROM subscription_plans WHERE target_audience = 'doctor';

-- Insert new doctor plans with correct structure
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
-- Basic Plan (Doctor) - Monthly
(
  'Basic',
  'doctor_basic_monthly',
  'Perfect for new solo practitioners starting to digitize their practice',
  4900,
  'monthly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 200 patient records',
      'Store past diagnoses and treatments',
      'Access to basic booking system',
      'Email support'
    ),
    'maxRecords', 200,
    'storageGB', 10
  ),
  true
),
-- Basic Plan (Doctor) - Yearly (10% discount)
(
  'Basic',
  'doctor_basic_yearly',
  'Perfect for new solo practitioners starting to digitize their practice',
  4410,
  'yearly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 200 patient records',
      'Store past diagnoses and treatments',
      'Access to basic booking system',
      'Email support'
    ),
    'maxRecords', 200,
    'storageGB', 10
  ),
  true
),
-- Pro Plan (Doctor) - Monthly
(
  'Pro',
  'doctor_pro_monthly',
  'Ideal for growing practices with frequent appointments',
  9900,
  'monthly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 1,000 patient records',
      'Store detailed treatment history',
      'Advanced calendar and appointment management',
      'Priority support'
    ),
    'maxRecords', 1000,
    'storageGB', 50
  ),
  true
),
-- Pro Plan (Doctor) - Yearly (10% discount)
(
  'Pro',
  'doctor_pro_yearly',
  'Ideal for growing practices with frequent appointments',
  8910,
  'yearly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage up to 1,000 patient records',
      'Store detailed treatment history',
      'Advanced calendar and appointment management',
      'Priority support'
    ),
    'maxRecords', 1000,
    'storageGB', 50
  ),
  true
),
-- Premium Plan (Doctor) - Monthly
(
  'Premium',
  'doctor_premium_monthly',
  'Best for high-volume practices requiring full digital management',
  19900,
  'monthly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage unlimited patient records',
      'Full treatment and diagnostics archive',
      'AI-assisted scheduling and reminders',
      'Dedicated account manager'
    ),
    'maxRecords', 'unlimited',
    'storageGB', 500
  ),
  true
),
-- Premium Plan (Doctor) - Yearly (10% discount)
(
  'Premium',
  'doctor_premium_yearly',
  'Best for high-volume practices requiring full digital management',
  17910,
  'yearly',
  'doctor',
  jsonb_build_object(
    'features', jsonb_build_array(
      'Manage unlimited patient records',
      'Full treatment and diagnostics archive',
      'AI-assisted scheduling and reminders',
      'Dedicated account manager'
    ),
    'maxRecords', 'unlimited',
    'storageGB', 500
  ),
  true
);