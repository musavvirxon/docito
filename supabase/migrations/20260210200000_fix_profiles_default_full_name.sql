-- Migration: Fix profiles to ensure full_name is always populated
-- Created: 2026-02-10 20:00:00

-- Set default full_name for existing profiles that are missing it
UPDATE profiles 
SET full_name = COALESCE(
  NULLIF(full_name, ''),
  split_part(email, '@', 1),
  'User'
)
WHERE full_name IS NULL OR full_name = '';

-- Add a trigger to automatically set full_name on insert if not provided
CREATE OR REPLACE FUNCTION set_default_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    NEW.full_name := COALESCE(
      split_part(NEW.email, '@', 1),
      'User'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_default_full_name ON profiles;

-- Create trigger
CREATE TRIGGER trigger_set_default_full_name
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_full_name();

-- Add index on full_name for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Verify the changes
DO $$
DECLARE
  missing_names INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_names
  FROM profiles
  WHERE full_name IS NULL OR full_name = '';
  
  IF missing_names > 0 THEN
    RAISE WARNING 'Found % profiles with missing full_name', missing_names;
  ELSE
    RAISE NOTICE 'All profiles have full_name populated';
  END IF;
END $$;
