-- Add doctor_id to procedure_templates so each doctor has their own diagnosis library
ALTER TABLE public.procedure_templates ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_procedure_templates_doctor_id ON public.procedure_templates(doctor_id);

-- Drop the existing SELECT-only policy
DROP POLICY IF EXISTS "Authenticated users can view procedure templates" ON public.procedure_templates;

-- Create proper RLS policies for doctors to manage their own templates
CREATE POLICY "Doctors can view their own templates"
  ON public.procedure_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    doctor_id IS NULL OR 
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  ));

CREATE POLICY "Doctors can insert their own templates"
  ON public.procedure_templates FOR INSERT
  WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can update their own templates"
  ON public.procedure_templates FOR UPDATE
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctors can delete their own templates"
  ON public.procedure_templates FOR DELETE
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );