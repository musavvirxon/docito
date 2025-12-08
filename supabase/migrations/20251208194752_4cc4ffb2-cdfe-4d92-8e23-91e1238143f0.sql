-- Add new staff roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing_manager';

-- Create clinic_staff table to link staff members to specific clinics with their staff role
CREATE TABLE IF NOT EXISTS public.clinic_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  staff_role text NOT NULL CHECK (staff_role IN ('receptionist', 'nurse', 'billing_manager', 'assistant', 'technician', 'hygienist', 'manager', 'other')),
  department text,
  hire_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  can_book_appointments boolean DEFAULT false,
  can_view_medical_records boolean DEFAULT false,
  can_manage_billing boolean DEFAULT false,
  can_manage_patients boolean DEFAULT false,
  can_view_schedule boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, practice_id)
);

-- Enable RLS
ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clinic_staff
CREATE POLICY "Staff can view their own record"
  ON public.clinic_staff FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Practice admins can manage their staff"
  ON public.clinic_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM practices p
      WHERE p.id = clinic_staff.practice_id
      AND p.admin_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all staff"
  ON public.clinic_staff FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create function to get staff permissions
CREATE OR REPLACE FUNCTION public.get_staff_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permissions jsonb;
BEGIN
  SELECT jsonb_build_object(
    'practice_id', cs.practice_id,
    'staff_role', cs.staff_role,
    'can_book_appointments', cs.can_book_appointments,
    'can_view_medical_records', cs.can_view_medical_records,
    'can_manage_billing', cs.can_manage_billing,
    'can_manage_patients', cs.can_manage_patients,
    'can_view_schedule', cs.can_view_schedule,
    'status', cs.status
  )
  INTO permissions
  FROM clinic_staff cs
  WHERE cs.user_id = p_user_id
  AND cs.status = 'active'
  LIMIT 1;
  
  RETURN COALESCE(permissions, '{}'::jsonb);
END;
$$;

-- Create function to check if user is staff of a practice
CREATE OR REPLACE FUNCTION public.is_practice_staff(p_user_id uuid, p_practice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE user_id = p_user_id
    AND practice_id = p_practice_id
    AND status = 'active'
  )
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_clinic_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_clinic_staff_updated_at
  BEFORE UPDATE ON public.clinic_staff
  FOR EACH ROW EXECUTE FUNCTION update_clinic_staff_updated_at();

-- Add staff-specific appointment policies
CREATE POLICY "Receptionists can view practice appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.user_id = auth.uid()
      AND cs.practice_id = appointments.practice_id
      AND cs.status = 'active'
      AND cs.can_view_schedule = true
    )
  );

CREATE POLICY "Receptionists can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.user_id = auth.uid()
      AND cs.practice_id = appointments.practice_id
      AND cs.status = 'active'
      AND cs.can_book_appointments = true
    )
  );

CREATE POLICY "Receptionists can update appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.user_id = auth.uid()
      AND cs.practice_id = appointments.practice_id
      AND cs.status = 'active'
      AND cs.can_book_appointments = true
    )
  );

-- Add staff access to profiles (limited view)
CREATE POLICY "Staff can view patient profiles for their practice"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      JOIN appointments a ON a.practice_id = cs.practice_id
      WHERE cs.user_id = auth.uid()
      AND a.patient_id = profiles.user_id
      AND cs.status = 'active'
    )
  );

-- Billing manager access to payments
CREATE POLICY "Billing managers can view practice payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.user_id = auth.uid()
      AND cs.practice_id = payments.practice_id
      AND cs.status = 'active'
      AND cs.can_manage_billing = true
    )
  );

CREATE POLICY "Billing managers can manage practice payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      WHERE cs.user_id = auth.uid()
      AND cs.practice_id = payments.practice_id
      AND cs.status = 'active'
      AND cs.can_manage_billing = true
    )
  );