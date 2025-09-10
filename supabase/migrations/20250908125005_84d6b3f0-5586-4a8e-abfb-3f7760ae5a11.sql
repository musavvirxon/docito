-- Phase 1: Database Foundation for Dental Practice Management System

-- Create enum types for better data consistency
CREATE TYPE public.procedure_category AS ENUM (
  'restorative',
  'surgical', 
  'orthodontic',
  'periodontal',
  'endodontic',
  'prosthodontic',
  'oral_surgery',
  'preventive',
  'cosmetic',
  'other'
);

CREATE TYPE public.procedure_type AS ENUM (
  'tooth_based',
  'oral_cavity_region'
);

CREATE TYPE public.tooth_numbering_system AS ENUM (
  'international_fdi',
  'universal',
  'palmer'
);

CREATE TYPE public.treatment_plan_status AS ENUM (
  'draft',
  'published',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE public.procedure_status AS ENUM (
  'planned',
  'in_progress', 
  'completed',
  'cancelled'
);

CREATE TYPE public.consent_status AS ENUM (
  'pending',
  'signed',
  'declined'
);

-- Procedures table (dentist's procedure library)
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dentist_id UUID NOT NULL,
  name TEXT NOT NULL,
  category procedure_category NOT NULL,
  type procedure_type NOT NULL,
  default_cost DECIMAL(10,2),
  notes TEXT,
  tooth_range INTEGER[], -- Array of tooth numbers
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Treatment plans table
CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dentist_id UUID NOT NULL,
  patient_id UUID NOT NULL, 
  title TEXT NOT NULL,
  description TEXT,
  status treatment_plan_status NOT NULL DEFAULT 'draft',
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Treatment plan procedures (junction table)
CREATE TABLE public.treatment_plan_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
  tooth_numbers INTEGER[], -- Specific teeth for this procedure instance
  custom_cost DECIMAL(10,2), -- Override default cost for this patient
  custom_notes TEXT, -- Additional notes for this patient
  status procedure_status NOT NULL DEFAULT 'planned',
  sequence_order INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consent forms table
CREATE TABLE public.consent_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content of consent form
  status consent_status NOT NULL DEFAULT 'pending',
  patient_signature TEXT, -- Base64 encoded signature
  patient_full_name TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- File attachments table
CREATE TABLE public.procedure_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
  treatment_plan_procedure_id UUID REFERENCES public.treatment_plan_procedures(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL, -- User who uploaded
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dentist settings table
CREATE TABLE public.dentist_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dentist_id UUID NOT NULL UNIQUE,
  default_tooth_numbering tooth_numbering_system NOT NULL DEFAULT 'international_fdi',
  practice_name TEXT,
  practice_address TEXT,
  practice_phone TEXT,
  practice_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for procedures (dentists can only see their own)
CREATE POLICY "Dentists can manage their own procedures"
ON public.procedures
FOR ALL
USING (auth.uid() = dentist_id)
WITH CHECK (auth.uid() = dentist_id);

-- RLS Policies for treatment_plans
CREATE POLICY "Dentists can manage their patients' treatment plans"
ON public.treatment_plans
FOR ALL
USING (auth.uid() = dentist_id)
WITH CHECK (auth.uid() = dentist_id);

CREATE POLICY "Patients can view their own treatment plans"
ON public.treatment_plans
FOR SELECT
USING (auth.uid() = patient_id);

-- RLS Policies for treatment_plan_procedures
CREATE POLICY "Dentists can manage treatment plan procedures"
ON public.treatment_plan_procedures
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
  )
);

CREATE POLICY "Patients can view their treatment plan procedures"
ON public.treatment_plan_procedures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.patient_id = auth.uid()
  )
);

-- RLS Policies for consent_forms
CREATE POLICY "Dentists can manage consent forms for their treatment plans"
ON public.consent_forms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
  )
);

CREATE POLICY "Patients can view and sign their consent forms"
ON public.consent_forms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.patient_id = auth.uid()
  )
);

CREATE POLICY "Patients can update their consent forms (signing)"
ON public.consent_forms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.patient_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.patient_id = auth.uid()
  )
);

-- RLS Policies for procedure_attachments
CREATE POLICY "Dentists can manage attachments for their procedures/plans"
ON public.procedure_attachments
FOR ALL
USING (
  CASE 
    WHEN treatment_plan_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.treatment_plans tp
        WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
      )
    WHEN procedure_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.procedures p
        WHERE p.id = procedure_id AND p.dentist_id = auth.uid()
      )
    ELSE false
  END
)
WITH CHECK (
  CASE 
    WHEN treatment_plan_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.treatment_plans tp
        WHERE tp.id = treatment_plan_id AND tp.dentist_id = auth.uid()
      )
    WHEN procedure_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.procedures p
        WHERE p.id = procedure_id AND p.dentist_id = auth.uid()
      )
    ELSE false
  END
);

CREATE POLICY "Patients can view attachments for their treatment plans"
ON public.procedure_attachments
FOR SELECT
USING (
  treatment_plan_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_id AND tp.patient_id = auth.uid()
  )
);

-- RLS Policies for dentist_settings
CREATE POLICY "Dentists can manage their own settings"
ON public.dentist_settings
FOR ALL
USING (auth.uid() = dentist_id)
WITH CHECK (auth.uid() = dentist_id);

-- Triggers for updated_at columns
CREATE TRIGGER update_procedures_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plan_procedures_updated_at
  BEFORE UPDATE ON public.treatment_plan_procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consent_forms_updated_at
  BEFORE UPDATE ON public.consent_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dentist_settings_updated_at
  BEFORE UPDATE ON public.dentist_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_procedures_dentist_id ON public.procedures(dentist_id);
CREATE INDEX idx_procedures_category ON public.procedures(category);
CREATE INDEX idx_treatment_plans_dentist_id ON public.treatment_plans(dentist_id);
CREATE INDEX idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX idx_treatment_plan_procedures_plan_id ON public.treatment_plan_procedures(treatment_plan_id);
CREATE INDEX idx_consent_forms_treatment_plan_id ON public.consent_forms(treatment_plan_id);
CREATE INDEX idx_procedure_attachments_treatment_plan_id ON public.procedure_attachments(treatment_plan_id);