-- Add additional fields to patient_insurance table
ALTER TABLE public.patient_insurance
ADD COLUMN IF NOT EXISTS group_number TEXT,
ADD COLUMN IF NOT EXISTS card_front_url TEXT,
ADD COLUMN IF NOT EXISTS card_back_url TEXT,
ADD COLUMN IF NOT EXISTS co_pay NUMERIC,
ADD COLUMN IF NOT EXISTS deductible NUMERIC,
ADD COLUMN IF NOT EXISTS annual_limit NUMERIC,
ADD COLUMN IF NOT EXISTS provider_phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS covers_emergency BOOLEAN DEFAULT true;

-- Drop the old file_url column if it exists (we're replacing with card_front_url/card_back_url)
-- Keep file_url for backwards compatibility but add the new columns