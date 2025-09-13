-- Add missing columns to procedures table
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Add missing columns to treatment_plan_procedures table  
ALTER TABLE public.treatment_plan_procedures 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1;

-- Create index for sequence_order for better performance
CREATE INDEX IF NOT EXISTS idx_treatment_plan_procedures_sequence 
ON public.treatment_plan_procedures(treatment_plan_id, sequence_order);

-- Update existing procedures to be active by default
UPDATE public.procedures SET active = TRUE WHERE active IS NULL;