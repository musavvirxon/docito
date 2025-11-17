-- Delete existing patient plans
DELETE FROM subscription_plans WHERE target_audience = 'patient';

-- Insert Access Plan (Monthly)
INSERT INTO subscription_plans (
  plan_code, name, description, price, billing_interval, target_audience, 
  features, is_active, stripe_price_id
) VALUES (
  'patient_access_monthly',
  'Access',
  'Basic users with minimal history',
  0,
  'monthly',
  'patient',
  jsonb_build_object(
    'storageMB', 100,
    'maxRecords', 5,
    'maxDiagnoses', 2,
    'maxTreatmentSummaries', 2,
    'maxFileSize', 5,
    'features', ARRAY[
      'Unlimited doctor search and booking',
      'Access to personal digital medical records',
      'Appointment reminders and notifications',
      'Secure messaging with doctors',
      'Basic clean dashboard'
    ]
  ),
  true,
  'price_patient_access_monthly'
);

-- Insert Prime Plan (Monthly)
INSERT INTO subscription_plans (
  plan_code, name, description, price, billing_interval, target_audience, 
  features, is_active, stripe_price_id
) VALUES (
  'patient_prime_monthly',
  'Prime',
  'Users with significant healthcare activity',
  2500,
  'monthly',
  'patient',
  jsonb_build_object(
    'storageGB', 5,
    'maxRecords', 200,
    'maxDiagnoses', 100,
    'maxTreatmentSummaries', 100,
    'maxFileSize', 500,
    'features', ARRAY[
      'Everything in Access',
      'Priority booking',
      'Health timeline view',
      'Emergency contact sharing',
      'Digital prescription uploads'
    ]
  ),
  true,
  'price_patient_prime_monthly'
);

-- Insert Elite Plan (Monthly)
INSERT INTO subscription_plans (
  plan_code, name, description, price, billing_interval, target_audience, 
  features, is_active, stripe_price_id
) VALUES (
  'patient_elite_monthly',
  'Elite',
  'Chronic patients, families, or heavy users',
  5000,
  'monthly',
  'patient',
  jsonb_build_object(
    'storageGB', 25,
    'maxRecords', 'unlimited',
    'maxDiagnoses', 'unlimited',
    'maxTreatmentSummaries', 'unlimited',
    'maxFileSize', 1024,
    'features', ARRAY[
      'Everything in Prime',
      'Full medical record cloud backup',
      'Multi-device synchronization',
      'Dedicated support',
      'Early access to upcoming AI features'
    ]
  ),
  true,
  'price_patient_elite_monthly'
);

-- Insert Prime Plan (Yearly - 10% discount)
INSERT INTO subscription_plans (
  plan_code, name, description, price, billing_interval, target_audience, 
  features, is_active, stripe_price_id
) VALUES (
  'patient_prime_yearly',
  'Prime',
  'Users with significant healthcare activity',
  27000,
  'yearly',
  'patient',
  jsonb_build_object(
    'storageGB', 5,
    'maxRecords', 200,
    'maxDiagnoses', 100,
    'maxTreatmentSummaries', 100,
    'maxFileSize', 500,
    'savings', 'Save 10% annually',
    'features', ARRAY[
      'Everything in Access',
      'Priority booking',
      'Health timeline view',
      'Emergency contact sharing',
      'Digital prescription uploads'
    ]
  ),
  true,
  'price_patient_prime_yearly'
);

-- Insert Elite Plan (Yearly - 10% discount)
INSERT INTO subscription_plans (
  plan_code, name, description, price, billing_interval, target_audience, 
  features, is_active, stripe_price_id
) VALUES (
  'patient_elite_yearly',
  'Elite',
  'Chronic patients, families, or heavy users',
  54000,
  'yearly',
  'patient',
  jsonb_build_object(
    'storageGB', 25,
    'maxRecords', 'unlimited',
    'maxDiagnoses', 'unlimited',
    'maxTreatmentSummaries', 'unlimited',
    'maxFileSize', 1024,
    'savings', 'Save 10% annually',
    'features', ARRAY[
      'Everything in Prime',
      'Full medical record cloud backup',
      'Multi-device synchronization',
      'Dedicated support',
      'Early access to upcoming AI features'
    ]
  ),
  true,
  'price_patient_elite_yearly'
);