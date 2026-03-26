
-- 1. Create appointment_clinical_item_templates table
CREATE TABLE IF NOT EXISTS public.appointment_clinical_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_cost NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointment_clinical_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own templates"
ON public.appointment_clinical_item_templates
FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

-- 2. Create appointment_clinical_items table
CREATE TABLE IF NOT EXISTS public.appointment_clinical_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(user_id),
  doctor_patient_id UUID REFERENCES public.doctor_patients(id),
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT,
  name TEXT,
  description TEXT,
  quantity INTEGER,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  cost NUMERIC,
  details JSONB,
  template_id UUID REFERENCES public.appointment_clinical_item_templates(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointment_clinical_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own clinical items"
ON public.appointment_clinical_items
FOR ALL TO authenticated
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients view own clinical items"
ON public.appointment_clinical_items
FOR SELECT TO authenticated
USING (patient_id = auth.uid());
