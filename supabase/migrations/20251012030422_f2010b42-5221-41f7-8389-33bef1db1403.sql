-- Create practice_locations table for clinic locations
CREATE TABLE IF NOT EXISTS public.practice_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  country VARCHAR DEFAULT 'United States',
  phone VARCHAR,
  email VARCHAR,
  is_primary BOOLEAN DEFAULT false,
  photo_urls TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create practice_staff table for non-doctor staff members
CREATE TABLE IF NOT EXISTS public.practice_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  role VARCHAR NOT NULL, -- e.g., "Nurse", "Receptionist", "Manager"
  department VARCHAR, -- e.g., "Front Desk", "Dental", "Cardiology"
  status VARCHAR DEFAULT 'active', -- active, inactive, part-time
  hire_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payments table for tracking billing transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method VARCHAR, -- cash, card, insurance, etc.
  transaction_id VARCHAR,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.practice_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_locations
CREATE POLICY "Anyone can view practice locations"
  ON public.practice_locations FOR SELECT
  USING (true);

CREATE POLICY "Practice admins can manage their locations"
  ON public.practice_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.practices p
      WHERE p.id = practice_locations.practice_id
      AND p.admin_id = auth.uid()
    )
  );

-- RLS Policies for practice_staff
CREATE POLICY "Practice admins can view their staff"
  ON public.practice_staff FOR SELECT
  USING (
    practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Practice admins can manage their staff"
  ON public.practice_staff FOR ALL
  USING (
    practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Practice admins can view their payments"
  ON public.payments FOR SELECT
  USING (
    practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Practice admins can manage their payments"
  ON public.payments FOR ALL
  USING (
    practice_id IN (
      SELECT id FROM public.practices WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own payments"
  ON public.payments FOR SELECT
  USING (patient_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_practice_locations_practice_id ON public.practice_locations(practice_id);
CREATE INDEX idx_practice_staff_practice_id ON public.practice_staff(practice_id);
CREATE INDEX idx_payments_practice_id ON public.payments(practice_id);
CREATE INDEX idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);

-- Update get_practice_stats function to include locations count
CREATE OR REPLACE FUNCTION public.get_practice_stats(p_practice_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSON;
  v_total_bookings INTEGER;
  v_total_patients INTEGER;
  v_total_revenue NUMERIC;
  v_pending_invites INTEGER;
  v_total_doctors INTEGER;
  v_total_locations INTEGER;
  v_clinic_rating NUMERIC;
BEGIN
  -- Get total bookings
  SELECT COUNT(*) INTO v_total_bookings
  FROM appointments
  WHERE practice_id = p_practice_id
  AND status IN ('confirmed', 'completed');
  
  -- Get unique patients
  SELECT COUNT(DISTINCT patient_id) INTO v_total_patients
  FROM appointments
  WHERE practice_id = p_practice_id
  AND status IN ('confirmed', 'completed');
  
  -- Calculate revenue (from completed appointments)
  SELECT COALESCE(SUM(d.consultation_fee), 0) INTO v_total_revenue
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id
  WHERE a.practice_id = p_practice_id
  AND a.status = 'completed';
  
  -- Get pending join requests
  SELECT COUNT(*) INTO v_pending_invites
  FROM practice_join_requests
  WHERE practice_id = p_practice_id
  AND status = 'pending';
  
  -- Get total doctors
  SELECT COUNT(*) INTO v_total_doctors
  FROM doctors
  WHERE practice_id = p_practice_id;
  
  -- Get total locations
  SELECT COUNT(*) INTO v_total_locations
  FROM practice_locations
  WHERE practice_id = p_practice_id;
  
  -- Get clinic rating from practice
  SELECT COALESCE(average_rating, 0) INTO v_clinic_rating
  FROM practices
  WHERE id = p_practice_id;
  
  -- Build result
  v_stats := json_build_object(
    'total_bookings', COALESCE(v_total_bookings, 0),
    'total_patients', COALESCE(v_total_patients, 0),
    'total_revenue', COALESCE(v_total_revenue, 0),
    'pending_invites', COALESCE(v_pending_invites, 0),
    'total_doctors', COALESCE(v_total_doctors, 0),
    'locations', COALESCE(v_total_locations, 0),
    'clinic_rating', COALESCE(v_clinic_rating, 0)
  );
  
  RETURN v_stats;
END;
$$;