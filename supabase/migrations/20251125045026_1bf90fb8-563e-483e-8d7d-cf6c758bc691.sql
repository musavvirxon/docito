-- Add new fields to doctors table for enhanced profile management
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS consultation_types TEXT[];

-- Set default values for existing records
UPDATE doctors 
SET 
  years_experience = 5,
  languages = ARRAY['English']::TEXT[],
  consultation_types = ARRAY['In-person', 'Video']::TEXT[]
WHERE years_experience IS NULL OR languages IS NULL OR consultation_types IS NULL;