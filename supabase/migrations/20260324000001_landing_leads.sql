-- ============================================================
-- Migration: landing_leads — quiz funnel lead capture
-- Timestamp: 20260324000001  (idempotent, safe to re-run)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.landing_leads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL,
  role         text        NOT NULL CHECK (role IN ('doctor', 'clinic')),
  quiz_answers jsonb,
  score        integer,
  score_level  text        CHECK (score_level IN ('low', 'medium', 'high')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous visitors (quiz completions) to insert leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'landing_leads'
      AND policyname  = 'anon_can_insert_lead'
  ) THEN
    CREATE POLICY "anon_can_insert_lead"
      ON public.landing_leads
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_landing_leads_email   ON public.landing_leads (email);
CREATE INDEX IF NOT EXISTS idx_landing_leads_role    ON public.landing_leads (role);
CREATE INDEX IF NOT EXISTS idx_landing_leads_created ON public.landing_leads (created_at DESC);
