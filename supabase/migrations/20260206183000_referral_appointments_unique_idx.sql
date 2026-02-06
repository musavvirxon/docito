-- File: supabase/migrations/20260206183000_referral_appointments_unique_idx.sql

-- Ensure referral ↔ appointment links cannot be duplicated.
-- Idempotent + safe to re-run.

DO $$
BEGIN
  -- Unique link per referral_id + appointment_id (NULL appointment_id rows are allowed and won't conflict)
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS referral_appointments_referral_appointment_uidx
           ON public.referral_appointments (referral_id, appointment_id)';

  -- Helpful lookup index for reverse queries by appointment_id
  EXECUTE 'CREATE INDEX IF NOT EXISTS referral_appointments_appointment_id_idx
           ON public.referral_appointments (appointment_id)';
EXCEPTION
  WHEN undefined_table THEN
    -- If table isn't present yet in this environment, skip gracefully.
    NULL;
END $$;
