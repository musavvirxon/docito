-- Migration: Ensure profiles RLS policies are correct
-- Created: 2026-02-11 00:00:00

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow authenticated users to view public profile data
CREATE POLICY "Authenticated can view public profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Ensure full_name is never null
ALTER TABLE profiles 
ALTER COLUMN full_name SET DEFAULT 'User';

-- Update existing null values
UPDATE profiles 
SET full_name = COALESCE(
  NULLIF(full_name, ''),
  split_part(email, '@', 1),
  'User'
)
WHERE full_name IS NULL OR full_name = '';

-- Create or replace trigger function
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_set_default_full_name ON profiles;
CREATE TRIGGER trigger_set_default_full_name
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_full_name();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
