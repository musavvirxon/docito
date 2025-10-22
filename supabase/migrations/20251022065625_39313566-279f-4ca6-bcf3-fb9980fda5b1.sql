-- Create procedure templates table
CREATE TABLE IF NOT EXISTS public.procedure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  duration_minutes INTEGER DEFAULT 30,
  default_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create treatment_plan_medications table
CREATE TABLE IF NOT EXISTS public.treatment_plan_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notification_times TEXT[],
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create treatment_plan_procedures table
CREATE TABLE IF NOT EXISTS public.treatment_plan_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  procedure_name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  cost DECIMAL(10,2),
  scheduled_date DATE,
  scheduled_time TIME,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample procedure templates
INSERT INTO public.procedure_templates (name, description, category, duration_minutes, default_price) VALUES
('General Cleaning', 'Routine dental cleaning and examination', 'Preventive', 30, 120),
('Deep Cleaning (Scaling)', 'Deep cleaning of teeth and gums', 'Preventive', 60, 200),
('Dental Filling (Composite)', 'Tooth-colored composite filling', 'Restorative', 45, 180),
('Root Canal Treatment', 'Endodontic treatment for infected tooth', 'Restorative', 90, 800),
('Tooth Extraction', 'Simple tooth extraction', 'Surgical', 30, 150),
('Crown Placement', 'Dental crown installation', 'Restorative', 60, 1200),
('Teeth Whitening', 'Professional teeth whitening treatment', 'Cosmetic', 60, 400),
('Dental Consultation', 'Initial consultation and examination', 'Consultation', 30, 100),
('X-Ray (Full Mouth)', 'Comprehensive dental X-ray', 'Assessment', 20, 150),
('Emergency Visit', 'Emergency dental care', 'Emergency', 45, 250)
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.procedure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_procedures ENABLE ROW LEVEL SECURITY;

-- RLS policies for procedure_templates (public read, admin write)
CREATE POLICY "Anyone can view procedure templates"
  ON public.procedure_templates FOR SELECT
  USING (true);

-- RLS policies for treatment_plan_medications
CREATE POLICY "Doctors can manage medications for their treatment plans"
  ON public.treatment_plan_medications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans tp
      JOIN public.doctors d ON d.id = tp.doctor_id
      WHERE tp.id = treatment_plan_medications.treatment_plan_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own medications"
  ON public.treatment_plan_medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans tp
      WHERE tp.id = treatment_plan_medications.treatment_plan_id
      AND tp.patient_id = auth.uid()
    )
  );

-- RLS policies for treatment_plan_procedures
CREATE POLICY "Doctors can manage procedures for their treatment plans"
  ON public.treatment_plan_procedures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans tp
      JOIN public.doctors d ON d.id = tp.doctor_id
      WHERE tp.id = treatment_plan_procedures.treatment_plan_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own treatment procedures"
  ON public.treatment_plan_procedures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans tp
      WHERE tp.id = treatment_plan_procedures.treatment_plan_id
      AND tp.patient_id = auth.uid()
    )
  );

-- Add is_bookable column to procedures if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='procedures' AND column_name='is_bookable') THEN
    ALTER TABLE public.procedures ADD COLUMN is_bookable BOOLEAN DEFAULT true;
  END IF;
END $$;