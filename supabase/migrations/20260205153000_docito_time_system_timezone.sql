-- File: supabase/migrations/20260205153000_docito_time_system_timezone.sql

-- =========================================================
-- Docito Time System (Step 1): Timezone persistence + lock
-- - Adds timezone metadata columns to user + facility settings
-- - Enforces facility timezone lock AFTER verification
-- - Updates handle_new_user() to seed timezone from signup metadata
-- =========================================================

-- -----------------------------
-- 1) Profiles: timezone metadata
-- -----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ;

-- -----------------------------
-- 2) Facility settings: timezone metadata
-- -----------------------------
ALTER TABLE public.practice_settings
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.imaging_center_settings
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.lab_center_settings
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.pharmacy_settings
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.entity_settings
  ADD COLUMN IF NOT EXISTS timezone_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS timezone_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- --------------------------------------------------------------------
-- 3) Enforcement trigger: prevent timezone changes when locked
--    - Allows service_role (Edge Functions / Admin actions)
--    - Allows super_admin users (if user_roles exists)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_timezone_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_role TEXT;
  v_uid UUID;
  v_is_super_admin BOOLEAN := false;
BEGIN
  v_role := auth.role();
  v_uid := auth.uid();

  IF OLD.timezone_locked IS TRUE AND NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    -- Allow service role (Edge Functions / server-side automation)
    IF v_role = 'service_role' THEN
      NEW.timezone_updated_at := now();
      RETURN NEW;
    END IF;

    -- Allow super_admin (if RBAC table exists)
    IF v_uid IS NOT NULL AND EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema='public' AND table_name='user_roles'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_uid
          AND ur.role::text = 'super_admin'
      ) INTO v_is_super_admin;
    END IF;

    IF v_is_super_admin THEN
      NEW.timezone_updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Timezone is locked and cannot be changed after verification'
      USING ERRCODE = '42501';
  END IF;

  -- If timezone changed (and not locked), update timestamp
  IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    NEW.timezone_updated_at := now();
    IF NEW.timezone_source IS NULL OR NEW.timezone_source = '' THEN
      NEW.timezone_source := 'manual';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  -- practice_settings trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='practice_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_practice_settings_timezone_lock'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_practice_settings_timezone_lock
               BEFORE UPDATE ON public.practice_settings
               FOR EACH ROW
               EXECUTE FUNCTION public.enforce_timezone_lock()';
    END IF;
  END IF;

  -- imaging_center_settings trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='imaging_center_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_imaging_center_settings_timezone_lock'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_imaging_center_settings_timezone_lock
               BEFORE UPDATE ON public.imaging_center_settings
               FOR EACH ROW
               EXECUTE FUNCTION public.enforce_timezone_lock()';
    END IF;
  END IF;

  -- lab_center_settings trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lab_center_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lab_center_settings_timezone_lock'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_lab_center_settings_timezone_lock
               BEFORE UPDATE ON public.lab_center_settings
               FOR EACH ROW
               EXECUTE FUNCTION public.enforce_timezone_lock()';
    END IF;
  END IF;

  -- pharmacy_settings trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pharmacy_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pharmacy_settings_timezone_lock'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_pharmacy_settings_timezone_lock
               BEFORE UPDATE ON public.pharmacy_settings
               FOR EACH ROW
               EXECUTE FUNCTION public.enforce_timezone_lock()';
    END IF;
  END IF;

  -- entity_settings trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entity_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_entity_settings_timezone_lock'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_entity_settings_timezone_lock
               BEFORE UPDATE ON public.entity_settings
               FOR EACH ROW
               EXECUTE FUNCTION public.enforce_timezone_lock()';
    END IF;
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 4) Update handle_new_user() to seed timezone from signup metadata
--    Reads: raw_user_meta_data.timezone + raw_user_meta_data.timezone_source
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_role_text text;
  v_profile_role user_role;
  v_tz text;
  v_tz_source text;
BEGIN
  v_role_text := COALESCE(new.raw_user_meta_data->>'role', 'patient');

  v_profile_role := CASE
    WHEN v_role_text IN ('pharmacy_admin', 'lab_admin', 'imaging_admin', 'clinic_admin', 'super_admin', 'admin') THEN 'admin'::user_role
    WHEN v_role_text = 'doctor' THEN 'doctor'::user_role
    WHEN v_role_text = 'staff' THEN 'staff'::user_role
    ELSE 'patient'::user_role
  END;

  v_tz := COALESCE(NULLIF(new.raw_user_meta_data->>'timezone', ''), 'UTC');
  v_tz_source := COALESCE(NULLIF(new.raw_user_meta_data->>'timezone_source', ''), 'browser');

  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    role,
    timezone,
    timezone_source,
    timezone_updated_at,
    timezone_detected_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_profile_role,
    v_tz,
    v_tz_source,
    now(),
    now()
  );

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, v_role_text::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN invalid_text_representation THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'patient'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
