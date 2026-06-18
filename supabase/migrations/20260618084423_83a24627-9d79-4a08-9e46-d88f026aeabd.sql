ALTER TABLE public.tooth_procedure_history ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.appointment_procedures ADD COLUMN IF NOT EXISTS category text;