-- Migration: 20260310120000_doctor_referrals_stats.sql
-- Adds a Postgres function to compute referral KPI stats for a doctor.
-- Idempotent: uses CREATE OR REPLACE, no destructive statements.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Function: get_doctor_referral_stats
--    Returns aggregate counts for a given doctor (by their doctor profile id).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_doctor_referral_stats(p_doctor_id uuid)
RETURNS TABLE (
  total_sent          bigint,
  total_received      bigint,
  pending_sent        bigint,   -- sent by doctor and not yet resolved
  pending_received    bigint,   -- received by doctor and awaiting action
  completed           bigint,
  rejected            bigint,
  this_month_sent     bigint,
  this_month_received bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- total sent
    COUNT(*) FILTER (
      WHERE referrer_type = 'doctor'
        AND referrer_entity_id = p_doctor_id
    )::bigint                                             AS total_sent,

    -- total received
    COUNT(*) FILTER (
      WHERE receiver_type = 'doctor'
        AND receiver_entity_id = p_doctor_id
    )::bigint                                             AS total_received,

    -- pending sent (sent but not yet accepted/rejected/completed)
    COUNT(*) FILTER (
      WHERE referrer_type = 'doctor'
        AND referrer_entity_id = p_doctor_id
        AND status IN ('draft', 'sent')
    )::bigint                                             AS pending_sent,

    -- pending received (waiting on this doctor to act)
    COUNT(*) FILTER (
      WHERE receiver_type = 'doctor'
        AND receiver_entity_id = p_doctor_id
        AND status IN ('sent', 'accepted')
    )::bigint                                             AS pending_received,

    -- completed (either direction)
    COUNT(*) FILTER (
      WHERE status = 'completed'
        AND (
          (referrer_type = 'doctor' AND referrer_entity_id = p_doctor_id)
          OR
          (receiver_type = 'doctor' AND receiver_entity_id = p_doctor_id)
        )
    )::bigint                                             AS completed,

    -- rejected (either direction)
    COUNT(*) FILTER (
      WHERE status IN ('rejected', 'cancelled')
        AND (
          (referrer_type = 'doctor' AND referrer_entity_id = p_doctor_id)
          OR
          (receiver_type = 'doctor' AND receiver_entity_id = p_doctor_id)
        )
    )::bigint                                             AS rejected,

    -- sent this calendar month
    COUNT(*) FILTER (
      WHERE referrer_type = 'doctor'
        AND referrer_entity_id = p_doctor_id
        AND date_trunc('month', created_at) = date_trunc('month', now())
    )::bigint                                             AS this_month_sent,

    -- received this calendar month
    COUNT(*) FILTER (
      WHERE receiver_type = 'doctor'
        AND receiver_entity_id = p_doctor_id
        AND date_trunc('month', created_at) = date_trunc('month', now())
    )::bigint                                             AS this_month_received

  FROM public.referrals
  WHERE
    (referrer_type = 'doctor' AND referrer_entity_id = p_doctor_id)
    OR
    (receiver_type = 'doctor' AND receiver_entity_id = p_doctor_id);
$$;

-- Grant execute to authenticated users only (RLS on referrals still applies for
-- the underlying data, but this function uses SECURITY DEFINER so we restrict at
-- the function level: callers should only query their own doctor id).
REVOKE ALL ON FUNCTION public.get_doctor_referral_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_referral_stats(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add index to speed up the stats query (idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'referrals'
      AND indexname  = 'idx_referrals_referrer_entity'
  ) THEN
    CREATE INDEX idx_referrals_referrer_entity
      ON public.referrals (referrer_type, referrer_entity_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'referrals'
      AND indexname  = 'idx_referrals_receiver_entity'
  ) THEN
    CREATE INDEX idx_referrals_receiver_entity
      ON public.referrals (receiver_type, receiver_entity_id);
  END IF;
END $$;
