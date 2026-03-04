ALTER TABLE public.appointment_holds 
ADD COLUMN IF NOT EXISTS procedure_id uuid REFERENCES procedures(id);