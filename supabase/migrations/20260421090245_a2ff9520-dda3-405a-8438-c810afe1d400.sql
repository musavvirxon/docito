
-- Add JSONB sections for medications, referrals, and tests on treatment plans
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS referrals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tests jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add follow-up tracking on treatment plan procedures
ALTER TABLE public.treatment_plan_procedures
  ADD COLUMN IF NOT EXISTS follow_up_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_appointment_id uuid NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_skipped_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS follow_up_notes text NULL;

CREATE INDEX IF NOT EXISTS idx_tp_procedures_follow_up_required
  ON public.treatment_plan_procedures (treatment_plan_id)
  WHERE follow_up_required = true AND follow_up_appointment_id IS NULL;
