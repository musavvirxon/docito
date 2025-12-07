-- Seed insurance providers and plans data
-- First insert providers, then their plans

-- Insert providers (using ON CONFLICT to avoid duplicates)
INSERT INTO insurance_providers (provider_name, country, is_global, logo_url) VALUES
-- Turkey
('Anadolu Sigorta', 'Turkey', true, null),
('Allianz Türkiye', 'Turkey', true, null),
('Aksigorta', 'Turkey', true, null),
-- Australia
('Medibank', 'Australia', true, null),
('Bupa Australia', 'Australia', true, null),
('HCF', 'Australia', true, null),
-- South Korea
('Samsung Life Insurance', 'South Korea', true, null),
('LINA Korea', 'South Korea', true, null),
('DB Insurance', 'South Korea', true, null),
-- Japan
('Japan Post Insurance', 'Japan', true, null),
('Nippon Life', 'Japan', true, null),
('Meiji Yasuda Life', 'Japan', true, null),
-- China
('Ping An Insurance', 'China', true, null),
('China Life', 'China', true, null),
('Taikang Insurance', 'China', true, null),
-- United States
('UnitedHealthcare', 'United States', true, null),
('Kaiser Permanente', 'United States', true, null),
('Blue Cross Blue Shield', 'United States', true, null),
-- United Kingdom
('Bupa UK', 'United Kingdom', true, null),
('AXA UK', 'United Kingdom', true, null),
('Aviva UK', 'United Kingdom', true, null),
-- Europe
('Allianz Germany', 'Germany', true, null),
('Axa France', 'France', true, null),
('Sanitas', 'Spain', true, null),
-- Middle East
('Daman Health', 'UAE', true, null),
('Oman Insurance', 'UAE', true, null),
('Bupa Arabia', 'Saudi Arabia', true, null),
('QLM Life & Medical', 'Qatar', true, null),
('GIG Kuwait', 'Kuwait', true, null),
('Bahrain National Insurance', 'Bahrain', true, null),
-- Africa
('Discovery Health', 'South Africa', true, null),
('Momentum Health', 'South Africa', true, null),
('Hygeia HMO', 'Nigeria', true, null),
('Jubilee Insurance', 'Kenya', true, null),
('Misr Insurance', 'Egypt', true, null),
-- CIS
('Eurasia Insurance', 'Kazakhstan', true, null),
('Gross Insurance', 'Uzbekistan', true, null),
('PASHA Insurance', 'Azerbaijan', true, null),
('Rosgosstrakh', 'Russia', true, null),
-- Latin America
('Amil', 'Brazil', true, null),
('Bradesco Saúde', 'Brazil', true, null),
('GNP Seguros', 'Mexico', true, null),
('Swiss Medical', 'Argentina', true, null),
('Colmena', 'Chile', true, null),
('SURA', 'Colombia', true, null)
ON CONFLICT DO NOTHING;

-- Insert plans for each provider
INSERT INTO insurance_plans (provider_id, plan_name, coverage_type, description)
SELECT ip.id, plans.plan_name, plans.coverage_type, plans.description
FROM insurance_providers ip
JOIN (VALUES
  -- Turkey
  ('Anadolu Sigorta', 'Sağlık Sigortası Özel Sağlık Planı', 'full', 'Comprehensive private health insurance'),
  ('Allianz Türkiye', 'Tamamlayıcı Sağlık Sigortası', 'full', 'Supplementary health insurance'),
  ('Aksigorta', 'Aksigorta Özel Sağlık Sigortası', 'full', 'Private health insurance plan'),
  -- Australia
  ('Medibank', 'Top Hospital & Extras', 'full', 'Top tier hospital and extras cover'),
  ('Bupa Australia', 'Gold Hospital – Premium', 'full', 'Premium gold hospital coverage'),
  ('HCF', 'Hospital Premium Cover', 'full', 'Premium hospital coverage'),
  -- South Korea
  ('Samsung Life Insurance', 'Comprehensive Medical Insurance', 'full', 'Full medical coverage'),
  ('LINA Korea', 'LINA Health Insurance Prime', 'full', 'Prime health insurance plan'),
  ('DB Insurance', 'DB Comprehensive Health Plan', 'full', 'Comprehensive health coverage'),
  -- Japan
  ('Japan Post Insurance', 'Kampo Medical Insurance', 'full', 'Traditional medical insurance'),
  ('Nippon Life', 'Mirai Medical Plan', 'full', 'Future medical plan'),
  ('Meiji Yasuda Life', 'Best Style Health Insurance', 'full', 'Premium style health coverage'),
  -- China
  ('Ping An Insurance', 'Ping An Good Health Medical Plan', 'full', 'Good health medical plan'),
  ('China Life', 'China Life Critical Illness Plan', 'medical', 'Critical illness coverage'),
  ('Taikang Insurance', 'Taikang Medical Insurance Elite', 'full', 'Elite medical insurance'),
  -- United States
  ('UnitedHealthcare', 'UHC Choice Plus', 'full', 'Flexible PPO plan'),
  ('Kaiser Permanente', 'KP Bronze 60 HMO', 'full', 'Bronze tier HMO plan'),
  ('Blue Cross Blue Shield', 'BCBS PPO Blue Advantage', 'full', 'PPO Blue Advantage plan'),
  -- United Kingdom
  ('Bupa UK', 'Bupa By You Comprehensive', 'full', 'Comprehensive customizable plan'),
  ('AXA UK', 'AXA Health Personal Health Plan', 'full', 'Personal health plan'),
  ('Aviva UK', 'Aviva Healthier Solutions', 'full', 'Healthier solutions coverage'),
  -- Europe
  ('Allianz Germany', 'Allianz Private Krankenversicherung', 'full', 'Private health insurance'),
  ('Axa France', 'AXA Complémentaire Santé', 'full', 'Complementary health insurance'),
  ('Sanitas', 'Sanitas Más Salud', 'full', 'More health coverage'),
  -- Middle East
  ('Daman Health', 'Thiqa Top Medical Plan', 'full', 'Top tier medical plan'),
  ('Oman Insurance', 'Bupa Global Health Plan', 'full', 'Global health coverage'),
  ('Bupa Arabia', 'Bupa Tameen Family Plan', 'full', 'Family insurance plan'),
  ('QLM Life & Medical', 'QLM Comprehensive Care', 'full', 'Comprehensive care coverage'),
  ('GIG Kuwait', 'Premier Medical Insurance', 'full', 'Premier medical coverage'),
  ('Bahrain National Insurance', 'Health Care Supreme', 'full', 'Supreme healthcare plan'),
  -- Africa
  ('Discovery Health', 'Discovery Classic Saver', 'full', 'Classic saver plan'),
  ('Momentum Health', 'Momentum Incentive Option', 'full', 'Incentive-based option'),
  ('Hygeia HMO', 'Hygeia Platinum Plan', 'full', 'Platinum tier plan'),
  ('Jubilee Insurance', 'Jubilee JCare Premium', 'full', 'Premium care coverage'),
  ('Misr Insurance', 'Misr Health Shield', 'full', 'Health shield coverage'),
  -- CIS
  ('Eurasia Insurance', 'Eurasia Health Program', 'full', 'Health program coverage'),
  ('Gross Insurance', 'Gross Medical Coverage Plus', 'full', 'Medical coverage plus'),
  ('PASHA Insurance', 'PASHA Medical Plan Premium', 'full', 'Premium medical plan'),
  ('Rosgosstrakh', 'RGS Voluntary Health Insurance', 'full', 'Voluntary health insurance'),
  -- Latin America
  ('Amil', 'Amil Medial 500', 'full', 'Medical 500 plan'),
  ('Bradesco Saúde', 'Bradesco Top Nacional', 'full', 'Top national coverage'),
  ('GNP Seguros', 'GNP Medical Elite', 'full', 'Elite medical plan'),
  ('Swiss Medical', 'SMG Plan Premium', 'full', 'Premium plan'),
  ('Colmena', 'Colmena Oro Plus', 'full', 'Gold plus coverage'),
  ('SURA', 'SURA Integral Health Plan', 'full', 'Integral health plan')
) AS plans(provider_name, plan_name, coverage_type, description)
ON ip.provider_name = plans.provider_name
ON CONFLICT DO NOTHING;