-- supabase/migrations/20260312120000_entity_logo_urls.sql
-- Adds logo_url to lab_centers, imaging_centers, and doctors tables.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS everywhere.
-- Also creates the entity-logos storage bucket if it doesn't exist,
-- with public read access and owner-only write access.

-- ── 1. Schema changes ─────────────────────────────────────────────────────────

ALTER TABLE public.lab_centers
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.imaging_centers
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Individual practitioners (doctors who are NOT part of a practice) can upload
-- their own logo. When a practice logo exists it takes precedence in PDFs.
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ── 2. Storage bucket ─────────────────────────────────────────────────────────

-- Create bucket (no-op if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entity-logos',
  'entity-logos',
  true,
  2097152, -- 2 MB max per file
  ARRAY['image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage RLS policies ───────────────────────────────────────────────────

-- Allow any authenticated user to upload into their own folder
-- (folder structure: entity-logos/<user_id>/filename.png)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'entity_logos_insert'
  ) THEN
    CREATE POLICY "entity_logos_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'entity-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'entity_logos_update'
  ) THEN
    CREATE POLICY "entity_logos_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'entity-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'entity_logos_delete'
  ) THEN
    CREATE POLICY "entity_logos_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'entity-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Public read (bucket is already public=true, but policy is belt-and-suspenders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'entity_logos_select_public'
  ) THEN
    CREATE POLICY "entity_logos_select_public"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'entity-logos');
  END IF;
END $$;
