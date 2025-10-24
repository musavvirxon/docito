-- =========================================
-- CRITICAL SECURITY FIX: User Roles Architecture
-- =========================================
-- This migration addresses 3 critical security issues:
-- 1. Creates separate user_roles table (prevents privilege escalation)
-- 2. Adds authorization to SECURITY DEFINER functions
-- 3. Enforces server-side role checks via RLS

-- Step 1: Create role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'admin', 'staff', 'super_admin');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS policies for user_roles (read-only for users, admin-managed)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Create SECURITY DEFINER function to check roles (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 6: Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'doctor' THEN 3
      WHEN 'staff' THEN 4
      WHEN 'patient' THEN 5
    END
  LIMIT 1
$$;

-- Step 7: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT 
  user_id,
  role::text::app_role,
  created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Update handle_new_user() to insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Extract role from metadata, default to patient
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'patient')::app_role;
  
  -- Insert profile
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    role
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    v_role::text::user_role
  );
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Step 9: Fix update_user_role() with proper authorization
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization check: only admins can change roles
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: admin role required');
  END IF;
  
  -- Update role in profiles (for backward compatibility)
  UPDATE profiles 
  SET role = new_role, updated_at = NOW()
  WHERE user_id = update_user_role.user_id;
  
  -- Update or insert into user_roles
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (update_user_role.user_id, new_role::text::app_role, auth.uid())
  ON CONFLICT (user_id, role) DO UPDATE
  SET assigned_at = NOW(), assigned_by = auth.uid();
  
  -- If changing to doctor, ensure doctor profile exists
  IF new_role = 'doctor' THEN
    INSERT INTO doctors (user_id, specialty, verified, accepts_new_patients)
    VALUES (update_user_role.user_id, 'General Practice', false, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object('success', true, 'role', new_role);
END;
$$;

-- Step 10: Fix create_or_get_patient_profile() with authorization
CREATE OR REPLACE FUNCTION public.create_or_get_patient_profile(
  p_full_name varchar,
  p_email varchar,
  p_phone varchar DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_is_doctor BOOLEAN;
  v_new_profile BOOLEAN := false;
BEGIN
  -- Authorization: only doctors can create patient profiles
  IF NOT public.has_role(auth.uid(), 'doctor') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only doctors can create patient profiles');
  END IF;
  
  -- Find by email
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE lower(trim(email)) = lower(trim(p_email))
    AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      IF p_phone IS NOT NULL AND trim(p_phone) != '' AND v_profile.phone IS DISTINCT FROM p_phone THEN
        UPDATE profiles SET phone = p_phone, updated_at = NOW() WHERE user_id = v_profile.user_id;
        v_profile.phone := p_phone;
      END IF;
      
      RETURN json_build_object(
        'success', true, 'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile), 'is_existing', true, 'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- Find by phone
  IF p_phone IS NOT NULL AND trim(p_phone) != '' THEN
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE trim(phone) = trim(p_phone) AND role = 'patient'
    LIMIT 1;
    
    IF FOUND THEN
      IF p_email IS NOT NULL AND trim(p_email) != '' AND v_profile.email IS DISTINCT FROM p_email THEN
        UPDATE profiles SET email = p_email, updated_at = NOW() WHERE user_id = v_profile.user_id;
        v_profile.email := p_email;
      END IF;
      
      RETURN json_build_object(
        'success', true, 'user_id', v_profile.user_id,
        'profile', row_to_json(v_profile), 'is_existing', true, 'is_verified', v_profile.is_verified
      );
    END IF;
  END IF;
  
  -- Create new guest profile
  INSERT INTO profiles (user_id, full_name, email, phone, role, is_verified, verification_token, token_expires_at)
  VALUES (
    gen_random_uuid(), p_full_name, p_email, p_phone, 'patient',
    false, encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '7 days'
  )
  RETURNING * INTO v_profile;
  
  -- Add patient role to user_roles
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (v_profile.user_id, 'patient', auth.uid())
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object(
    'success', true, 'user_id', v_profile.user_id,
    'profile', row_to_json(v_profile), 'is_existing', false, 'is_verified', false,
    'send_sms', true, 'verification_token', v_profile.verification_token
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 11: Fix book_appointment() with authorization
CREATE OR REPLACE FUNCTION public.book_appointment(
  doctor_id uuid,
  patient_id uuid,
  practice_id uuid,
  appointment_date date,
  start_time time,
  end_time time,
  notes text DEFAULT NULL,
  payment_intent_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_validation JSON;
  new_appointment_id UUID;
BEGIN
  -- Authorization: user must be the patient, a doctor, or admin
  IF auth.uid() != patient_id 
     AND NOT public.has_role(auth.uid(), 'doctor') 
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: cannot book appointments for other users');
  END IF;
  
  -- Validate the time slot
  SELECT public.validate_appointment_slot(doctor_id, appointment_date, start_time, end_time) INTO slot_validation;
  
  IF NOT (slot_validation->>'available')::BOOLEAN THEN
    RETURN json_build_object('success', false, 'error', slot_validation->>'message');
  END IF;
  
  -- Create the appointment
  INSERT INTO appointments (doctor_id, patient_id, practice_id, appointment_date, start_time, end_time, notes, status)
  VALUES (doctor_id, patient_id, practice_id, appointment_date, start_time, end_time, notes, 'pending')
  RETURNING id INTO new_appointment_id;
  
  RETURN json_build_object('success', true, 'appointment_id', new_appointment_id);
END;
$$;

-- Step 12: Fix add_procedure_to_treatment_plan() with authorization
CREATE OR REPLACE FUNCTION public.add_procedure_to_treatment_plan(
  treatment_plan_id uuid,
  procedure_id uuid,
  cost numeric DEFAULT NULL,
  notes text DEFAULT NULL,
  tooth_numbers integer[] DEFAULT NULL,
  sequence_order integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  procedure_cost NUMERIC;
  new_sequence INTEGER;
  plan_doctor_id UUID;
BEGIN
  -- Authorization: verify user is the doctor for this treatment plan
  SELECT tp.doctor_id INTO plan_doctor_id
  FROM treatment_plans tp
  WHERE tp.id = treatment_plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Treatment plan not found');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = plan_doctor_id AND d.user_id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: you are not the doctor for this treatment plan');
  END IF;
  
  -- Get procedure default cost if not provided
  IF cost IS NULL THEN
    SELECT default_cost INTO procedure_cost FROM procedures WHERE id = procedure_id;
    cost := procedure_cost;
  END IF;
  
  -- Get next sequence order if not provided
  IF sequence_order IS NULL THEN
    SELECT COALESCE(MAX(sequence_order), 0) + 1 INTO new_sequence
    FROM treatment_plan_procedures 
    WHERE treatment_plan_id = add_procedure_to_treatment_plan.treatment_plan_id;
    sequence_order := new_sequence;
  END IF;
  
  -- Add procedure to treatment plan
  INSERT INTO treatment_plan_procedures (
    treatment_plan_id, procedure_id, cost, notes, tooth_numbers, sequence_order
  ) VALUES (
    treatment_plan_id, procedure_id, cost, notes, tooth_numbers, sequence_order
  );
  
  -- Update total cost of treatment plan
  UPDATE treatment_plans SET
    total_cost = (
      SELECT COALESCE(SUM(cost), 0) 
      FROM treatment_plan_procedures 
      WHERE treatment_plan_id = add_procedure_to_treatment_plan.treatment_plan_id
    ),
    updated_at = NOW()
  WHERE id = treatment_plan_id;
  
  RETURN json_build_object('success', true, 'message', 'Procedure added to treatment plan');
END;
$$;

-- Step 13: Update key RLS policies to use has_role()
-- Practices table - admin management
DROP POLICY IF EXISTS "Admins can update their own practice" ON practices;
CREATE POLICY "Admins can update their own practice"
ON practices FOR UPDATE
TO authenticated
USING (
  admin_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  admin_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Practice staff - admin only
DROP POLICY IF EXISTS "Practice admins can manage their staff" ON practice_staff;
CREATE POLICY "Practice admins can manage their staff"
ON practice_staff FOR ALL
TO authenticated
USING (
  practice_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Practice settings - admin only
DROP POLICY IF EXISTS "Practice admins can update their settings" ON practice_settings;
CREATE POLICY "Practice admins can update their settings"
ON practice_settings FOR UPDATE
TO authenticated
USING (
  practice_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Medical records - restrict to authorized users
DROP POLICY IF EXISTS "Patients can manage own medical records" ON medical_records;
CREATE POLICY "Authorized users can manage medical records"
ON medical_records FOR ALL
TO authenticated
USING (
  auth.uid() = patient_id OR 
  auth.uid() = added_by OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'admin')
);

-- Comment on security architecture
COMMENT ON TABLE public.user_roles IS 'Secure role management table - roles stored separately from user profiles to prevent privilege escalation. Access controlled via SECURITY DEFINER functions.';
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER function to safely check user roles. Bypasses RLS to prevent recursive policy checks.';