-- ============================================================
-- Practice Public Profile — Banner & Social Media Support
-- File: supabase/migrations/20260626_practice_public_profile.sql
-- ============================================================

-- 1. Add banner + social columns to practices
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS banner_url      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url   TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url    TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url     TEXT;

-- 2. Ensure anon users can read practices (for the public profile page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practices' AND policyname = 'practices_public_read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "practices_public_read" ON practices
        FOR SELECT USING (true);
    $p$;
  END IF;
END
$$;

-- 3. Ensure anon users can read the doctor view (for affiliated doctors)
GRANT SELECT ON doctor_profiles_view TO anon, authenticated;
GRANT SELECT ON practices             TO anon, authenticated;
