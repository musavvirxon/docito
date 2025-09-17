-- User Management & Authentication Functions
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role user_role)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's role in profiles table
  UPDATE profiles 
  SET role = new_role, updated_at = NOW()
  WHERE user_id = update_user_role.user_id;
  
  -- If changing to doctor, ensure doctor profile exists
  IF new_role = 'doctor' THEN
    INSERT INTO doctors (user_id, specialty, verified, accepts_new_patients)
    VALUES (update_user_role.user_id, 'General Practice', false, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object('success', true, 'role', new_role);
END;
$$;

-- Appointments & Scheduling Functions
CREATE OR REPLACE FUNCTION public.validate_appointment_slot(
  doctor_id UUID,
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  exclude_appointment_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicting appointments
  SELECT COUNT(*) INTO conflict_count
  FROM appointments a
  WHERE a.doctor_id = validate_appointment_slot.doctor_id
    AND a.appointment_date = validate_appointment_slot.appointment_date
    AND a.status != 'canceled'
    AND (exclude_appointment_id IS NULL OR a.id != exclude_appointment_id)
    AND (
      (a.start_time <= validate_appointment_slot.start_time AND a.end_time > validate_appointment_slot.start_time) OR
      (a.start_time < validate_appointment_slot.end_time AND a.end_time >= validate_appointment_slot.end_time) OR
      (a.start_time >= validate_appointment_slot.start_time AND a.end_time <= validate_appointment_slot.end_time)
    );
  
  IF conflict_count > 0 THEN
    RETURN json_build_object('available', false, 'message', 'Time slot conflicts with existing appointment');
  END IF;
  
  RETURN json_build_object('available', true, 'message', 'Time slot is available');
END;
$$;

CREATE OR REPLACE FUNCTION public.book_appointment(
  doctor_id UUID,
  patient_id UUID,
  practice_id UUID,
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  notes TEXT DEFAULT NULL,
  payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_validation JSON;
  new_appointment_id UUID;
BEGIN
  -- Validate the time slot
  SELECT public.validate_appointment_slot(doctor_id, appointment_date, start_time, end_time) INTO slot_validation;
  
  IF NOT (slot_validation->>'available')::BOOLEAN THEN
    RETURN json_build_object('success', false, 'error', slot_validation->>'message');
  END IF;
  
  -- Create the appointment
  INSERT INTO appointments (doctor_id, patient_id, practice_id, appointment_date, start_time, end_time, notes, status)
  VALUES (doctor_id, patient_id, practice_id, appointment_date, start_time, end_time, notes, 'pending')
  RETURNING id INTO new_appointment_id;
  
  -- If payment_intent_id provided, store it (for Stripe integration)
  IF payment_intent_id IS NOT NULL THEN
    -- This would be handled by Stripe webhook or edge function
    NULL;
  END IF;
  
  RETURN json_build_object('success', true, 'appointment_id', new_appointment_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_or_update_appointment(
  appointment_id UUID,
  new_status appointment_status DEFAULT NULL,
  new_date DATE DEFAULT NULL,
  new_start_time TIME DEFAULT NULL,
  new_end_time TIME DEFAULT NULL,
  new_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_appointment appointments%ROWTYPE;
  slot_validation JSON;
BEGIN
  -- Get current appointment
  SELECT * INTO current_appointment FROM appointments WHERE id = appointment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Appointment not found');
  END IF;
  
  -- If rescheduling, validate new slot
  IF new_date IS NOT NULL AND new_start_time IS NOT NULL AND new_end_time IS NOT NULL THEN
    SELECT public.validate_appointment_slot(
      current_appointment.doctor_id, 
      new_date, 
      new_start_time, 
      new_end_time, 
      appointment_id
    ) INTO slot_validation;
    
    IF NOT (slot_validation->>'available')::BOOLEAN THEN
      RETURN json_build_object('success', false, 'error', slot_validation->>'message');
    END IF;
  END IF;
  
  -- Update appointment
  UPDATE appointments SET
    status = COALESCE(new_status, status),
    appointment_date = COALESCE(new_date, appointment_date),
    start_time = COALESCE(new_start_time, start_time),
    end_time = COALESCE(new_end_time, end_time),
    notes = COALESCE(new_notes, notes)
  WHERE id = appointment_id;
  
  RETURN json_build_object('success', true, 'appointment_id', appointment_id);
END;
$$;

-- Treatment Plans Functions
CREATE OR REPLACE FUNCTION public.add_procedure_to_treatment_plan(
  treatment_plan_id UUID,
  procedure_id UUID,
  cost NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  tooth_numbers INTEGER[] DEFAULT NULL,
  sequence_order INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  procedure_cost NUMERIC;
  new_sequence INTEGER;
BEGIN
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

CREATE OR REPLACE FUNCTION public.add_medication_to_treatment_plan(
  treatment_plan_id UUID,
  medication_name VARCHAR,
  dosage VARCHAR,
  frequency VARCHAR,
  start_date DATE,
  end_date DATE DEFAULT NULL,
  instructions TEXT DEFAULT NULL,
  reminder_enabled BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_patient_id UUID;
  new_medication_id UUID;
BEGIN
  -- Get patient ID from treatment plan
  SELECT patient_id INTO plan_patient_id FROM treatment_plans WHERE id = treatment_plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Treatment plan not found');
  END IF;
  
  -- Add medication
  INSERT INTO medications (
    treatment_plan_id, patient_id, name, dosage, frequency, 
    start_date, end_date, instructions, reminder_enabled
  ) VALUES (
    treatment_plan_id, plan_patient_id, medication_name, dosage, frequency,
    start_date, end_date, instructions, reminder_enabled
  ) RETURNING id INTO new_medication_id;
  
  RETURN json_build_object('success', true, 'medication_id', new_medication_id);
END;
$$;

-- Procedures & Informed Consent Functions
CREATE OR REPLACE FUNCTION public.sign_informed_consent(
  consent_form_id UUID,
  patient_full_name VARCHAR,
  digital_signature TEXT DEFAULT NULL,
  patient_signature TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE consent_forms SET
    status = 'signed',
    patient_full_name = sign_informed_consent.patient_full_name,
    digital_signature = sign_informed_consent.digital_signature,
    patient_signature = sign_informed_consent.patient_signature,
    ip_address = sign_informed_consent.ip_address,
    signed_at = NOW()
  WHERE id = consent_form_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Consent form not found');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Consent form signed successfully');
END;
$$;