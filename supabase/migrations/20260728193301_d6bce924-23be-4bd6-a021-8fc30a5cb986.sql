ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS dentition_type text NOT NULL DEFAULT 'permanent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'treatment_plans_dentition_type_check'
  ) THEN
    ALTER TABLE public.treatment_plans
      ADD CONSTRAINT treatment_plans_dentition_type_check
      CHECK (dentition_type IN ('permanent','primary'));
  END IF;
END $$;