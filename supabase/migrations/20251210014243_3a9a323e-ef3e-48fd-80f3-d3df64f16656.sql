-- ==========================================
-- PHARMACY SYSTEM - STEP 1: Core Tables
-- ==========================================

-- Add pharmacist role
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pharmacist';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PHARMACIES TABLE
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  tax_id VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  admin_id UUID REFERENCES auth.users(id),
  logo_url TEXT,
  website TEXT,
  operating_hours JSONB DEFAULT '{}',
  accepts_insurance BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(50) DEFAULT 'pending',
  average_rating NUMERIC(3,2) DEFAULT 0,
  num_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PHARMACY STAFF TABLE
CREATE TABLE IF NOT EXISTS public.pharmacy_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  staff_role VARCHAR(50) NOT NULL DEFAULT 'staff',
  license_number VARCHAR(100),
  can_dispense BOOLEAN DEFAULT false,
  can_manage_inventory BOOLEAN DEFAULT false,
  can_process_prescriptions BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active',
  hired_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pharmacy_id, user_id)
);

-- PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'RX-' || substr(gen_random_uuid()::text, 1, 8),
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  appointment_id UUID REFERENCES public.appointments(id),
  status VARCHAR(50) DEFAULT 'pending',
  prescribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 year',
  refills_remaining INTEGER DEFAULT 0,
  refills_total INTEGER DEFAULT 0,
  notes TEXT,
  signature_url TEXT,
  diagnosis_code VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRESCRIPTION ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  medication_code VARCHAR(50),
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50) DEFAULT 'tablets',
  instructions TEXT,
  substitutions_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PHARMACY INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  medication_code VARCHAR(50),
  ndc_code VARCHAR(20),
  manufacturer VARCHAR(255),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_cost NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  expiry_date DATE,
  batch_number VARCHAR(50),
  storage_location VARCHAR(100),
  requires_refrigeration BOOLEAN DEFAULT false,
  is_controlled_substance BOOLEAN DEFAULT false,
  controlled_substance_schedule VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FULFILLMENT ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.fulfillment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'FO-' || substr(gen_random_uuid()::text, 1, 8),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id),
  patient_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to UUID,
  dispensed_by UUID,
  verified_by UUID,
  total_amount NUMERIC(10,2),
  insurance_amount NUMERIC(10,2) DEFAULT 0,
  copay_amount NUMERIC(10,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  pickup_method VARCHAR(50) DEFAULT 'in_store',
  delivery_address TEXT,
  delivery_notes TEXT,
  estimated_ready_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns to verification_documents
ALTER TABLE public.verification_documents 
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;

-- Update existing practice documents
UPDATE public.verification_documents 
SET entity_type = 'practice', entity_id = practice_id 
WHERE entity_type IS NULL AND practice_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacies_verification_status ON public.pharmacies(verification_status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_admin ON public.pharmacies(admin_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_staff_pharmacy ON public.pharmacy_staff(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy ON public.pharmacy_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_pharmacy ON public.fulfillment_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_status ON public.fulfillment_orders(status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_entity ON public.verification_documents(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_orders ENABLE ROW LEVEL SECURITY;

-- Pharmacies policies
CREATE POLICY "Anyone can view verified pharmacies" ON public.pharmacies
  FOR SELECT USING (verified = true);

CREATE POLICY "Pharmacy admins can manage their pharmacy" ON public.pharmacies
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Super admins can manage all pharmacies" ON public.pharmacies
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Pharmacy staff policies
CREATE POLICY "Pharmacy admins can manage their staff" ON public.pharmacy_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies p WHERE p.id = pharmacy_staff.pharmacy_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Staff can view their own record" ON public.pharmacy_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all pharmacy staff" ON public.pharmacy_staff
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

-- Prescriptions policies
CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors can manage their prescriptions" ON public.prescriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM doctors d WHERE d.id = prescriptions.doctor_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Pharmacy staff can view assigned prescriptions" ON public.prescriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pharmacy_staff ps 
      WHERE ps.pharmacy_id = prescriptions.pharmacy_id 
      AND ps.user_id = auth.uid() 
      AND ps.status = 'active'
    )
  );

CREATE POLICY "Pharmacy staff can update prescriptions" ON public.prescriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pharmacy_staff ps 
      WHERE ps.pharmacy_id = prescriptions.pharmacy_id 
      AND ps.user_id = auth.uid() 
      AND ps.status = 'active'
      AND ps.can_process_prescriptions = true
    )
  );

-- Prescription items policies
CREATE POLICY "Users can view prescription items" ON public.prescription_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prescriptions p 
      WHERE p.id = prescription_items.prescription_id 
      AND (
        p.patient_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM doctors d WHERE d.id = p.doctor_id AND d.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pharmacy_staff ps WHERE ps.pharmacy_id = p.pharmacy_id AND ps.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Doctors can manage prescription items" ON public.prescription_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prescriptions p 
      JOIN doctors d ON d.id = p.doctor_id 
      WHERE p.id = prescription_items.prescription_id AND d.user_id = auth.uid()
    )
  );

-- Pharmacy inventory policies
CREATE POLICY "Pharmacy staff can view inventory" ON public.pharmacy_inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pharmacy_staff ps WHERE ps.pharmacy_id = pharmacy_inventory.pharmacy_id AND ps.user_id = auth.uid())
  );

CREATE POLICY "Pharmacy admins can manage inventory" ON public.pharmacy_inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies p WHERE p.id = pharmacy_inventory.pharmacy_id AND p.admin_id = auth.uid())
  );

CREATE POLICY "Inventory staff can manage" ON public.pharmacy_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pharmacy_staff ps 
      WHERE ps.pharmacy_id = pharmacy_inventory.pharmacy_id 
      AND ps.user_id = auth.uid() 
      AND ps.can_manage_inventory = true
    )
  );

-- Fulfillment orders policies
CREATE POLICY "Patients can view their fulfillment orders" ON public.fulfillment_orders
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Pharmacy staff can manage fulfillment orders" ON public.fulfillment_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pharmacy_staff ps 
      WHERE ps.pharmacy_id = fulfillment_orders.pharmacy_id 
      AND ps.user_id = auth.uid() 
      AND ps.status = 'active'
    )
  );

-- Update verification_documents policies
DROP POLICY IF EXISTS "Entity owners can manage their verification documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Super admins can manage all verification documents" ON public.verification_documents;

CREATE POLICY "Entity owners can manage their verification documents" ON public.verification_documents
  FOR ALL USING (
    (entity_type = 'practice' AND EXISTS (SELECT 1 FROM practices p WHERE p.id = verification_documents.entity_id AND p.admin_id = auth.uid()))
    OR (entity_type = 'pharmacy' AND EXISTS (SELECT 1 FROM pharmacies ph WHERE ph.id = verification_documents.entity_id AND ph.admin_id = auth.uid()))
    OR (entity_type = 'doctor' AND EXISTS (SELECT 1 FROM doctors d WHERE d.id = verification_documents.entity_id AND d.user_id = auth.uid()))
    OR (practice_id IS NOT NULL AND EXISTS (SELECT 1 FROM practices p WHERE p.id = verification_documents.practice_id AND p.admin_id = auth.uid()))
  );

CREATE POLICY "Super admins can manage all verification documents" ON public.verification_documents
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Triggers
CREATE OR REPLACE FUNCTION update_pharmacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pharmacies_updated_at ON pharmacies;
CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_pharmacy_updated_at();

DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_pharmacy_updated_at();

DROP TRIGGER IF EXISTS update_fulfillment_orders_updated_at ON fulfillment_orders;
CREATE TRIGGER update_fulfillment_orders_updated_at
  BEFORE UPDATE ON fulfillment_orders
  FOR EACH ROW EXECUTE FUNCTION update_pharmacy_updated_at();

-- Functions for prescription management
CREATE OR REPLACE FUNCTION public.create_prescription(
  p_patient_id UUID,
  p_doctor_id UUID,
  p_items JSONB,
  p_refills INTEGER DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prescription_id UUID;
  v_item JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doctors WHERE id = p_doctor_id AND user_id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  INSERT INTO prescriptions (patient_id, doctor_id, refills_remaining, refills_total, notes, status)
  VALUES (p_patient_id, p_doctor_id, p_refills, p_refills, p_notes, 'pending')
  RETURNING id INTO v_prescription_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO prescription_items (
      prescription_id, medication_name, medication_code, dosage, 
      frequency, quantity, unit, instructions, substitutions_allowed
    ) VALUES (
      v_prescription_id,
      v_item->>'medication_name',
      v_item->>'medication_code',
      v_item->>'dosage',
      v_item->>'frequency',
      (v_item->>'quantity')::INTEGER,
      COALESCE(v_item->>'unit', 'tablets'),
      v_item->>'instructions',
      COALESCE((v_item->>'substitutions_allowed')::BOOLEAN, true)
    );
  END LOOP;

  RETURN json_build_object('success', true, 'prescription_id', v_prescription_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_prescription_to_pharmacy(
  p_prescription_id UUID,
  p_pharmacy_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prescription prescriptions%ROWTYPE;
  v_fulfillment_id UUID;
BEGIN
  SELECT * INTO v_prescription FROM prescriptions WHERE id = p_prescription_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Prescription not found');
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM doctors d WHERE d.id = v_prescription.doctor_id AND d.user_id = auth.uid())
    OR v_prescription.patient_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE prescriptions 
  SET pharmacy_id = p_pharmacy_id, status = 'sent_to_pharmacy', updated_at = now()
  WHERE id = p_prescription_id;

  INSERT INTO fulfillment_orders (prescription_id, pharmacy_id, patient_id, status)
  VALUES (p_prescription_id, p_pharmacy_id, v_prescription.patient_id, 'pending')
  RETURNING id INTO v_fulfillment_id;

  RETURN json_build_object('success', true, 'fulfillment_id', v_fulfillment_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_fulfillment_order(
  p_fulfillment_id UUID,
  p_action VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order fulfillment_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM fulfillment_orders WHERE id = p_fulfillment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pharmacy_staff ps 
    WHERE ps.pharmacy_id = v_order.pharmacy_id 
    AND ps.user_id = auth.uid() 
    AND ps.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_action = 'start_processing' THEN
    UPDATE fulfillment_orders SET status = 'processing', assigned_to = auth.uid(), updated_at = now()
    WHERE id = p_fulfillment_id;
  ELSIF p_action = 'ready_for_pickup' THEN
    UPDATE fulfillment_orders SET status = 'ready', ready_at = now(), updated_at = now()
    WHERE id = p_fulfillment_id;
  ELSIF p_action = 'complete' THEN
    UPDATE fulfillment_orders SET status = 'completed', picked_up_at = now(), dispensed_by = auth.uid(), updated_at = now()
    WHERE id = p_fulfillment_id;
    UPDATE prescriptions SET status = 'fulfilled' WHERE id = v_order.prescription_id;
  ELSIF p_action = 'cancel' THEN
    UPDATE fulfillment_orders SET status = 'cancelled', notes = p_notes, updated_at = now()
    WHERE id = p_fulfillment_id;
  END IF;

  RETURN json_build_object('success', true, 'status', p_action);
END;
$$;