-- Add multilingual columns to practices table
ALTER TABLE practices 
ADD COLUMN IF NOT EXISTS name_en VARCHAR,
ADD COLUMN IF NOT EXISTS name_ru VARCHAR,
ADD COLUMN IF NOT EXISTS name_uz VARCHAR,
ADD COLUMN IF NOT EXISTS name_ar VARCHAR,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_uz TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Migrate existing data to English fields
UPDATE practices 
SET name_en = name,
    description_en = description
WHERE name_en IS NULL;

-- Add multilingual columns to doctors table
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS specialty_en VARCHAR,
ADD COLUMN IF NOT EXISTS specialty_ru VARCHAR,
ADD COLUMN IF NOT EXISTS specialty_uz VARCHAR,
ADD COLUMN IF NOT EXISTS specialty_ar VARCHAR,
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS bio_ru TEXT,
ADD COLUMN IF NOT EXISTS bio_uz TEXT,
ADD COLUMN IF NOT EXISTS bio_ar TEXT;

-- Migrate existing data to English fields
UPDATE doctors
SET specialty_en = specialty,
    bio_en = bio
WHERE specialty_en IS NULL;

-- Add multilingual columns to practice_services table (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_services'
  ) THEN
    ALTER TABLE practice_services
    ADD COLUMN IF NOT EXISTS name_en VARCHAR,
    ADD COLUMN IF NOT EXISTS name_ru VARCHAR,
    ADD COLUMN IF NOT EXISTS name_uz VARCHAR,
    ADD COLUMN IF NOT EXISTS name_ar VARCHAR,
    ADD COLUMN IF NOT EXISTS description_en TEXT,
    ADD COLUMN IF NOT EXISTS description_ru TEXT,
    ADD COLUMN IF NOT EXISTS description_uz TEXT,
    ADD COLUMN IF NOT EXISTS description_ar TEXT;

    UPDATE practice_services
    SET name_en = name,
        description_en = description
    WHERE name_en IS NULL;
  END IF;
END $$;

-- Add multilingual columns to practice_locations table
ALTER TABLE practice_locations
ADD COLUMN IF NOT EXISTS name_en VARCHAR,
ADD COLUMN IF NOT EXISTS name_ru VARCHAR,
ADD COLUMN IF NOT EXISTS name_uz VARCHAR,
ADD COLUMN IF NOT EXISTS name_ar VARCHAR,
ADD COLUMN IF NOT EXISTS address_en TEXT,
ADD COLUMN IF NOT EXISTS address_ru TEXT,
ADD COLUMN IF NOT EXISTS address_uz TEXT,
ADD COLUMN IF NOT EXISTS address_ar TEXT;

-- Migrate existing data
UPDATE practice_locations
SET name_en = name,
    address_en = address
WHERE name_en IS NULL;

-- Create user_preferences table for language persistence
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);