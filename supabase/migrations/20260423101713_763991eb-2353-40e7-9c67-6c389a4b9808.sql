-- 1. Add preferred_currency to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD';

-- 2. Supported currencies lookup
CREATE TABLE IF NOT EXISTS public.supported_currencies (
  code text PRIMARY KEY,
  symbol text NOT NULL,
  name text NOT NULL,
  locale text NOT NULL DEFAULT 'en-US',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view supported currencies" ON public.supported_currencies;
CREATE POLICY "Anyone can view supported currencies"
  ON public.supported_currencies FOR SELECT
  USING (true);

INSERT INTO public.supported_currencies (code, symbol, name, locale) VALUES
  ('USD', '$', 'US Dollar', 'en-US'),
  ('EUR', '€', 'Euro', 'de-DE'),
  ('GBP', '£', 'British Pound', 'en-GB'),
  ('JPY', '¥', 'Japanese Yen', 'ja-JP'),
  ('KRW', '₩', 'South Korean Won', 'ko-KR'),
  ('RUB', '₽', 'Russian Ruble', 'ru-RU'),
  ('TRY', '₺', 'Turkish Lira', 'tr-TR'),
  ('UZS', 'soʻm', 'Uzbekistani Som', 'uz-UZ'),
  ('CNY', '¥', 'Chinese Yuan', 'zh-CN'),
  ('SAR', '﷼', 'Saudi Riyal', 'ar-SA'),
  ('BRL', 'R$', 'Brazilian Real', 'pt-BR'),
  ('MXN', '$', 'Mexican Peso', 'es-MX'),
  ('CAD', 'C$', 'Canadian Dollar', 'en-CA'),
  ('AUD', 'A$', 'Australian Dollar', 'en-AU'),
  ('CHF', 'CHF', 'Swiss Franc', 'de-CH'),
  ('INR', '₹', 'Indian Rupee', 'en-IN')
ON CONFLICT (code) DO NOTHING;

-- 3. FX rates table (base USD, updated daily by cron)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'USD',
  quote text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'ecb',
  UNIQUE (base, quote)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view fx rates" ON public.fx_rates;
CREATE POLICY "Anyone can view fx rates"
  ON public.fx_rates FOR SELECT
  USING (true);

-- Seed reasonable static defaults (overwritten on first cron run)
INSERT INTO public.fx_rates (base, quote, rate, source) VALUES
  ('USD','USD',1.000,'seed'),
  ('USD','EUR',0.92,'seed'),
  ('USD','GBP',0.79,'seed'),
  ('USD','JPY',155.0,'seed'),
  ('USD','KRW',1380.0,'seed'),
  ('USD','RUB',92.0,'seed'),
  ('USD','TRY',32.5,'seed'),
  ('USD','UZS',12700.0,'seed'),
  ('USD','CNY',7.25,'seed'),
  ('USD','SAR',3.75,'seed'),
  ('USD','BRL',5.10,'seed'),
  ('USD','MXN',17.0,'seed'),
  ('USD','CAD',1.36,'seed'),
  ('USD','AUD',1.52,'seed'),
  ('USD','CHF',0.91,'seed'),
  ('USD','INR',83.0,'seed')
ON CONFLICT (base, quote) DO NOTHING;

-- 4. Appointment summary audit log
CREATE TABLE IF NOT EXISTS public.appointment_summary_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  verification_code text NOT NULL UNIQUE,
  document_url text,
  generated_by uuid,
  entity_type text,
  entity_id uuid,
  patient_id uuid,
  doctor_id uuid,
  display_currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_summary_appointment ON public.appointment_summary_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_summary_patient ON public.appointment_summary_documents(patient_id);

ALTER TABLE public.appointment_summary_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patient can view own summaries" ON public.appointment_summary_documents;
CREATE POLICY "Patient can view own summaries"
  ON public.appointment_summary_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = generated_by OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Authenticated users can insert summaries" ON public.appointment_summary_documents;
CREATE POLICY "Authenticated users can insert summaries"
  ON public.appointment_summary_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generated_by);

-- 5. Enable extensions for daily FX cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;