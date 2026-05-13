ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS code text;
CREATE INDEX IF NOT EXISTS idx_procedures_code ON public.procedures(code);