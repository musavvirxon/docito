-- Add internal clinic roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'internal_lab_tech';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'internal_imaging_tech';

-- Add service flags to practices table
ALTER TABLE public.practices 
ADD COLUMN IF NOT EXISTS has_lab_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_imaging_service BOOLEAN DEFAULT false;

-- Create clinic_departments table
CREATE TABLE public.clinic_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL, -- 'lab' or 'imaging'
  display_name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'active', -- active, disabled
  equipment_list TEXT[],
  test_templates JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, name)
);

-- Create clinic_department_staff table
CREATE TABLE public.clinic_department_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.clinic_departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  clinic_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL, -- internal_lab_tech, internal_imaging_tech
  license_number VARCHAR,
  can_view_orders BOOLEAN DEFAULT true,
  can_upload_results BOOLEAN DEFAULT true,
  can_manage_equipment BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'active',
  hired_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, user_id)
);

-- Create clinic_lab_orders table
CREATE TABLE public.clinic_lab_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR NOT NULL DEFAULT ('CLO-' || substr(gen_random_uuid()::text, 1, 8)),
  clinic_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.clinic_departments(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_id UUID REFERENCES public.appointments(id),
  test_type VARCHAR NOT NULL, -- blood, hormone, microbiology, urinalysis, etc.
  test_name VARCHAR NOT NULL,
  test_code VARCHAR,
  priority VARCHAR DEFAULT 'routine', -- stat, urgent, routine
  clinical_notes TEXT,
  diagnosis_codes TEXT[],
  status VARCHAR DEFAULT 'pending', -- pending, sample_collected, processing, completed, cancelled
  sample_collected_at TIMESTAMPTZ,
  sample_collected_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  result_data JSONB DEFAULT '{}',
  result_text TEXT,
  result_url TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  reference_range VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinic_imaging_orders table
CREATE TABLE public.clinic_imaging_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR NOT NULL DEFAULT ('CIO-' || substr(gen_random_uuid()::text, 1, 8)),
  clinic_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.clinic_departments(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_id UUID REFERENCES public.appointments(id),
  modality VARCHAR NOT NULL, -- xray, ct, mri, ultrasound, cbct, panoramic
  body_part VARCHAR,
  exam_name VARCHAR NOT NULL,
  priority VARCHAR DEFAULT 'routine',
  clinical_notes TEXT,
  diagnosis_codes TEXT[],
  status VARCHAR DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  performed_at TIMESTAMPTZ,
  performed_by UUID REFERENCES auth.users(id),
  radiologist_id UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  result_images TEXT[], -- array of file URLs
  result_report TEXT,
  result_url TEXT,
  impression TEXT,
  findings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_clinic_departments_clinic ON public.clinic_departments(clinic_id);
CREATE INDEX idx_clinic_dept_staff_dept ON public.clinic_department_staff(department_id);
CREATE INDEX idx_clinic_dept_staff_user ON public.clinic_department_staff(user_id);
CREATE INDEX idx_clinic_dept_staff_clinic ON public.clinic_department_staff(clinic_id);
CREATE INDEX idx_clinic_lab_orders_clinic ON public.clinic_lab_orders(clinic_id);
CREATE INDEX idx_clinic_lab_orders_doctor ON public.clinic_lab_orders(doctor_id);
CREATE INDEX idx_clinic_lab_orders_patient ON public.clinic_lab_orders(patient_id);
CREATE INDEX idx_clinic_lab_orders_status ON public.clinic_lab_orders(status);
CREATE INDEX idx_clinic_imaging_orders_clinic ON public.clinic_imaging_orders(clinic_id);
CREATE INDEX idx_clinic_imaging_orders_doctor ON public.clinic_imaging_orders(doctor_id);
CREATE INDEX idx_clinic_imaging_orders_patient ON public.clinic_imaging_orders(patient_id);
CREATE INDEX idx_clinic_imaging_orders_status ON public.clinic_imaging_orders(status);

-- Enable RLS
ALTER TABLE public.clinic_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_department_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_imaging_orders ENABLE ROW LEVEL SECURITY;

-- RLS for clinic_departments
CREATE POLICY "Clinic admins can manage their departments" ON public.clinic_departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM practices p WHERE p.id = clinic_departments.clinic_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Department staff can view their department" ON public.clinic_departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clinic_department_staff cds WHERE cds.department_id = clinic_departments.id AND cds.user_id = auth.uid())
  );

CREATE POLICY "Clinic doctors can view departments" ON public.clinic_departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.practice_id = clinic_departments.clinic_id AND d.user_id = auth.uid())
  );

-- RLS for clinic_department_staff
CREATE POLICY "Clinic admins can manage department staff" ON public.clinic_department_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM practices p WHERE p.id = clinic_department_staff.clinic_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Staff can view their own record" ON public.clinic_department_staff
  FOR SELECT USING (user_id = auth.uid());

-- RLS for clinic_lab_orders
CREATE POLICY "Clinic admins can manage lab orders" ON public.clinic_lab_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM practices p WHERE p.id = clinic_lab_orders.clinic_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Doctors can create and view their lab orders" ON public.clinic_lab_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.id = clinic_lab_orders.doctor_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Lab techs can view and update lab orders" ON public.clinic_lab_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clinic_department_staff cds
      JOIN clinic_departments cd ON cd.id = cds.department_id
      WHERE cd.clinic_id = clinic_lab_orders.clinic_id
      AND cd.name = 'lab'
      AND cds.user_id = auth.uid()
      AND cds.status = 'active'
    )
  );

CREATE POLICY "Patients can view their own lab orders" ON public.clinic_lab_orders
  FOR SELECT USING (patient_id = auth.uid() AND status = 'completed');

-- RLS for clinic_imaging_orders
CREATE POLICY "Clinic admins can manage imaging orders" ON public.clinic_imaging_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM practices p WHERE p.id = clinic_imaging_orders.clinic_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Doctors can create and view their imaging orders" ON public.clinic_imaging_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.id = clinic_imaging_orders.doctor_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Imaging techs can view and update imaging orders" ON public.clinic_imaging_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clinic_department_staff cds
      JOIN clinic_departments cd ON cd.id = cds.department_id
      WHERE cd.clinic_id = clinic_imaging_orders.clinic_id
      AND cd.name = 'imaging'
      AND cds.user_id = auth.uid()
      AND cds.status = 'active'
    )
  );

CREATE POLICY "Patients can view their own imaging orders" ON public.clinic_imaging_orders
  FOR SELECT USING (patient_id = auth.uid() AND status = 'completed');

-- Triggers for updated_at
CREATE TRIGGER update_clinic_departments_updated_at BEFORE UPDATE ON public.clinic_departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_dept_staff_updated_at BEFORE UPDATE ON public.clinic_department_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_lab_orders_updated_at BEFORE UPDATE ON public.clinic_lab_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_imaging_orders_updated_at BEFORE UPDATE ON public.clinic_imaging_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create department when service is enabled
CREATE OR REPLACE FUNCTION public.handle_clinic_service_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create lab department if enabled
  IF NEW.has_lab_service = true AND (OLD.has_lab_service IS NULL OR OLD.has_lab_service = false) THEN
    INSERT INTO clinic_departments (clinic_id, name, display_name, description)
    VALUES (NEW.id, 'lab', 'Diagnostic Laboratory', 'In-house laboratory services')
    ON CONFLICT (clinic_id, name) DO UPDATE SET status = 'active';
  END IF;
  
  -- Disable lab department if disabled
  IF NEW.has_lab_service = false AND OLD.has_lab_service = true THEN
    UPDATE clinic_departments SET status = 'disabled' WHERE clinic_id = NEW.id AND name = 'lab';
  END IF;
  
  -- Create imaging department if enabled
  IF NEW.has_imaging_service = true AND (OLD.has_imaging_service IS NULL OR OLD.has_imaging_service = false) THEN
    INSERT INTO clinic_departments (clinic_id, name, display_name, description)
    VALUES (NEW.id, 'imaging', 'Imaging Center', 'In-house imaging and radiology services')
    ON CONFLICT (clinic_id, name) DO UPDATE SET status = 'active';
  END IF;
  
  -- Disable imaging department if disabled
  IF NEW.has_imaging_service = false AND OLD.has_imaging_service = true THEN
    UPDATE clinic_departments SET status = 'disabled' WHERE clinic_id = NEW.id AND name = 'imaging';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_clinic_service_toggle
  AFTER UPDATE OF has_lab_service, has_imaging_service ON public.practices
  FOR EACH ROW EXECUTE FUNCTION handle_clinic_service_toggle();

-- Function to create lab order
CREATE OR REPLACE FUNCTION public.create_clinic_lab_order(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_test_type VARCHAR,
  p_test_name VARCHAR,
  p_test_code VARCHAR DEFAULT NULL,
  p_priority VARCHAR DEFAULT 'routine',
  p_clinical_notes TEXT DEFAULT NULL,
  p_diagnosis_codes TEXT[] DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
  v_department_id UUID;
  v_order_id UUID;
BEGIN
  -- Get doctor id
  SELECT id INTO v_doctor_id FROM doctors WHERE user_id = auth.uid();
  
  IF v_doctor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can create lab orders');
  END IF;
  
  -- Check clinic has lab service
  IF NOT EXISTS (SELECT 1 FROM practices WHERE id = p_clinic_id AND has_lab_service = true) THEN
    RETURN json_build_object('success', false, 'error', 'This clinic does not have lab services enabled');
  END IF;
  
  -- Get department id
  SELECT id INTO v_department_id FROM clinic_departments WHERE clinic_id = p_clinic_id AND name = 'lab' AND status = 'active';
  
  -- Create order
  INSERT INTO clinic_lab_orders (
    clinic_id, department_id, doctor_id, patient_id, appointment_id,
    test_type, test_name, test_code, priority, clinical_notes, diagnosis_codes
  ) VALUES (
    p_clinic_id, v_department_id, v_doctor_id, p_patient_id, p_appointment_id,
    p_test_type, p_test_name, p_test_code, p_priority, p_clinical_notes, p_diagnosis_codes
  ) RETURNING id INTO v_order_id;
  
  RETURN json_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- Function to create imaging order
CREATE OR REPLACE FUNCTION public.create_clinic_imaging_order(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_modality VARCHAR,
  p_exam_name VARCHAR,
  p_body_part VARCHAR DEFAULT NULL,
  p_priority VARCHAR DEFAULT 'routine',
  p_clinical_notes TEXT DEFAULT NULL,
  p_diagnosis_codes TEXT[] DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
  v_department_id UUID;
  v_order_id UUID;
BEGIN
  -- Get doctor id
  SELECT id INTO v_doctor_id FROM doctors WHERE user_id = auth.uid();
  
  IF v_doctor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can create imaging orders');
  END IF;
  
  -- Check clinic has imaging service
  IF NOT EXISTS (SELECT 1 FROM practices WHERE id = p_clinic_id AND has_imaging_service = true) THEN
    RETURN json_build_object('success', false, 'error', 'This clinic does not have imaging services enabled');
  END IF;
  
  -- Get department id
  SELECT id INTO v_department_id FROM clinic_departments WHERE clinic_id = p_clinic_id AND name = 'imaging' AND status = 'active';
  
  -- Create order
  INSERT INTO clinic_imaging_orders (
    clinic_id, department_id, doctor_id, patient_id, appointment_id,
    modality, exam_name, body_part, priority, clinical_notes, diagnosis_codes
  ) VALUES (
    p_clinic_id, v_department_id, v_doctor_id, p_patient_id, p_appointment_id,
    p_modality, p_exam_name, p_body_part, p_priority, p_clinical_notes, p_diagnosis_codes
  ) RETURNING id INTO v_order_id;
  
  RETURN json_build_object('success', true, 'order_id', v_order_id);
END;
$$;