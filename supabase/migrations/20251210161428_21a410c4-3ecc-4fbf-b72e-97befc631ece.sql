-- Add lab_technician to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lab_technician';

-- Create lab_centers table
CREATE TABLE public.lab_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'laboratory', -- laboratory, imaging, both
  license_number VARCHAR,
  address TEXT NOT NULL,
  city VARCHAR NOT NULL,
  state VARCHAR,
  country VARCHAR NOT NULL DEFAULT 'UZ',
  postal_code VARCHAR,
  phone VARCHAR NOT NULL,
  email VARCHAR,
  website VARCHAR,
  admin_id UUID REFERENCES auth.users(id),
  operating_hours JSONB DEFAULT '{}',
  services_offered TEXT[],
  accreditations TEXT[],
  accepts_insurance BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'pending', -- pending, active, suspended
  average_turnaround_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lab_staff table
CREATE TABLE public.lab_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_center_id UUID NOT NULL REFERENCES public.lab_centers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  staff_role VARCHAR NOT NULL DEFAULT 'technician', -- technician, supervisor, admin, phlebotomist, radiologist
  license_number VARCHAR,
  specializations TEXT[],
  can_process_samples BOOLEAN DEFAULT false,
  can_upload_results BOOLEAN DEFAULT false,
  can_verify_results BOOLEAN DEFAULT false,
  can_manage_equipment BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'active',
  hired_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lab_center_id, user_id)
);

-- Create test_catalog table (available tests)
CREATE TABLE public.test_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_center_id UUID REFERENCES public.lab_centers(id) ON DELETE CASCADE,
  test_code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  category VARCHAR NOT NULL, -- blood, urine, imaging, pathology, microbiology, etc.
  subcategory VARCHAR,
  description TEXT,
  sample_type VARCHAR, -- blood, urine, stool, tissue, etc.
  preparation_instructions TEXT,
  turnaround_hours INTEGER DEFAULT 24,
  price NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  requires_fasting BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false, -- true for system-wide tests
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_orders table
CREATE TABLE public.test_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR NOT NULL DEFAULT ('TO-' || substr(gen_random_uuid()::text, 1, 8)),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  doctor_id UUID REFERENCES public.doctors(id),
  lab_center_id UUID REFERENCES public.lab_centers(id),
  appointment_id UUID REFERENCES public.appointments(id),
  priority VARCHAR DEFAULT 'routine', -- stat, urgent, routine
  status VARCHAR DEFAULT 'pending', -- pending, scheduled, sample_collected, processing, completed, cancelled
  clinical_notes TEXT,
  diagnosis_codes TEXT[],
  scheduled_date DATE,
  scheduled_time TIME,
  sample_collected_at TIMESTAMPTZ,
  sample_collected_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  total_amount NUMERIC(10,2) DEFAULT 0,
  insurance_covered BOOLEAN DEFAULT false,
  payment_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_order_items table
CREATE TABLE public.test_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_order_id UUID NOT NULL REFERENCES public.test_orders(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.test_catalog(id),
  status VARCHAR DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_results table
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_order_item_id UUID NOT NULL REFERENCES public.test_order_items(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL DEFAULT '{}', -- structured result data
  result_text TEXT, -- narrative result
  reference_range VARCHAR,
  unit VARCHAR,
  is_abnormal BOOLEAN DEFAULT false,
  abnormal_flag VARCHAR, -- high, low, critical_high, critical_low
  interpretation TEXT,
  performed_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  status VARCHAR DEFAULT 'preliminary', -- preliminary, final, amended, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create test_result_files table (for images, PDFs, etc.)
CREATE TABLE public.test_result_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER,
  file_category VARCHAR DEFAULT 'report', -- report, image, scan, raw_data
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lab_centers_admin ON public.lab_centers(admin_id);
CREATE INDEX idx_lab_centers_status ON public.lab_centers(status);
CREATE INDEX idx_lab_staff_lab_center ON public.lab_staff(lab_center_id);
CREATE INDEX idx_lab_staff_user ON public.lab_staff(user_id);
CREATE INDEX idx_test_catalog_lab ON public.test_catalog(lab_center_id);
CREATE INDEX idx_test_catalog_category ON public.test_catalog(category);
CREATE INDEX idx_test_orders_patient ON public.test_orders(patient_id);
CREATE INDEX idx_test_orders_doctor ON public.test_orders(doctor_id);
CREATE INDEX idx_test_orders_lab ON public.test_orders(lab_center_id);
CREATE INDEX idx_test_orders_status ON public.test_orders(status);
CREATE INDEX idx_test_order_items_order ON public.test_order_items(test_order_id);
CREATE INDEX idx_test_results_order_item ON public.test_results(test_order_item_id);

-- Enable RLS
ALTER TABLE public.lab_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_result_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_centers
CREATE POLICY "Anyone can view verified lab centers" ON public.lab_centers
  FOR SELECT USING (is_verified = true AND status = 'active');

CREATE POLICY "Lab admins can manage their lab center" ON public.lab_centers
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Super admins can manage all lab centers" ON public.lab_centers
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for lab_staff
CREATE POLICY "Lab staff can view their own record" ON public.lab_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Lab admins can manage their staff" ON public.lab_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lab_centers lc
      WHERE lc.id = lab_staff.lab_center_id AND lc.admin_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all lab staff" ON public.lab_staff
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for test_catalog
CREATE POLICY "Anyone can view active tests" ON public.test_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY "Lab admins can manage their test catalog" ON public.test_catalog
  FOR ALL USING (
    lab_center_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.lab_centers lc
      WHERE lc.id = test_catalog.lab_center_id AND lc.admin_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all tests" ON public.test_catalog
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for test_orders
CREATE POLICY "Patients can view their own test orders" ON public.test_orders
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view and create test orders for their patients" ON public.test_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = test_orders.doctor_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab staff can view and update their lab orders" ON public.test_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lab_staff ls
      WHERE ls.lab_center_id = test_orders.lab_center_id 
      AND ls.user_id = auth.uid()
      AND ls.status = 'active'
    )
  );

-- RLS Policies for test_order_items
CREATE POLICY "Users can view test order items they have access to" ON public.test_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_orders t
      WHERE t.id = test_order_items.test_order_id
      AND (
        t.patient_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = t.doctor_id AND d.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = t.lab_center_id AND ls.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Lab staff can manage test order items" ON public.test_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.test_orders t
      JOIN public.lab_staff ls ON ls.lab_center_id = t.lab_center_id
      WHERE t.id = test_order_items.test_order_id
      AND ls.user_id = auth.uid()
      AND ls.status = 'active'
    )
  );

-- RLS Policies for test_results
CREATE POLICY "Patients can view their final results" ON public.test_results
  FOR SELECT USING (
    status = 'final' AND
    EXISTS (
      SELECT 1 FROM public.test_order_items toi
      JOIN public.test_orders t ON t.id = toi.test_order_id
      WHERE toi.id = test_results.test_order_item_id
      AND t.patient_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view all results for their orders" ON public.test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_order_items toi
      JOIN public.test_orders t ON t.id = toi.test_order_id
      JOIN public.doctors d ON d.id = t.doctor_id
      WHERE toi.id = test_results.test_order_item_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab staff can manage results" ON public.test_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.test_order_items toi
      JOIN public.test_orders t ON t.id = toi.test_order_id
      JOIN public.lab_staff ls ON ls.lab_center_id = t.lab_center_id
      WHERE toi.id = test_results.test_order_item_id
      AND ls.user_id = auth.uid()
      AND ls.status = 'active'
    )
  );

-- RLS Policies for test_result_files
CREATE POLICY "Users can view result files they have access to" ON public.test_result_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_results tr
      JOIN public.test_order_items toi ON toi.id = tr.test_order_item_id
      JOIN public.test_orders t ON t.id = toi.test_order_id
      WHERE tr.id = test_result_files.test_result_id
      AND (
        (t.patient_id = auth.uid() AND tr.status = 'final')
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = t.doctor_id AND d.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.lab_staff ls WHERE ls.lab_center_id = t.lab_center_id AND ls.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Lab staff can upload result files" ON public.test_result_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_results tr
      JOIN public.test_order_items toi ON toi.id = tr.test_order_item_id
      JOIN public.test_orders t ON t.id = toi.test_order_id
      JOIN public.lab_staff ls ON ls.lab_center_id = t.lab_center_id
      WHERE tr.id = test_result_files.test_result_id
      AND ls.user_id = auth.uid()
      AND ls.can_upload_results = true
    )
  );

-- Update trigger for timestamps
CREATE TRIGGER update_lab_centers_updated_at BEFORE UPDATE ON public.lab_centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_staff_updated_at BEFORE UPDATE ON public.lab_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_catalog_updated_at BEFORE UPDATE ON public.test_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_orders_updated_at BEFORE UPDATE ON public.test_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_order_items_updated_at BEFORE UPDATE ON public.test_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();