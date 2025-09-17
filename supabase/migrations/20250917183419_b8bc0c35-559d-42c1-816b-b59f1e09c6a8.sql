-- Continue with remaining database functions

-- Notifications & Messaging Functions
CREATE OR REPLACE FUNCTION public.send_notification_to_user(
  recipient_user_id UUID,
  notification_type VARCHAR,
  title VARCHAR,
  message TEXT,
  data JSONB DEFAULT '{}',
  sender_user_id UUID DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO real_time_notifications (
    recipient_user_id, sender_user_id, notification_type, 
    title, message, data, expires_at
  ) VALUES (
    recipient_user_id, sender_user_id, notification_type,
    title, message, data, expires_at
  ) RETURNING id INTO notification_id;
  
  RETURN json_build_object('success', true, 'notification_id', notification_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
  notification_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE real_time_notifications 
  SET read_at = NOW()
  WHERE id = notification_id AND recipient_user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Notification not found or access denied');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Notification marked as read');
END;
$$;

-- Advanced Functionality
CREATE OR REPLACE FUNCTION public.fetch_available_slots(
  doctor_id UUID,
  date_from DATE,
  date_to DATE,
  procedure_duration INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_slots JSON[];
  current_date DATE;
  time_slot TIME;
  slot_available BOOLEAN;
  slot_validation JSON;
BEGIN
  current_date := date_from;
  
  WHILE current_date <= date_to LOOP
    -- Check slots from 9 AM to 5 PM in 30-minute intervals
    time_slot := '09:00'::TIME;
    
    WHILE time_slot <= '17:00'::TIME LOOP
      -- Validate this time slot
      SELECT public.validate_appointment_slot(
        doctor_id, 
        current_date, 
        time_slot, 
        time_slot + (procedure_duration || ' minutes')::INTERVAL
      ) INTO slot_validation;
      
      slot_available := (slot_validation->>'available')::BOOLEAN;
      
      IF slot_available THEN
        available_slots := array_append(available_slots, 
          json_build_object(
            'date', current_date,
            'start_time', time_slot,
            'end_time', time_slot + (procedure_duration || ' minutes')::INTERVAL,
            'available', true
          )
        );
      END IF;
      
      time_slot := time_slot + '30 minutes'::INTERVAL;
    END LOOP;
    
    current_date := current_date + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'slots', available_slots);
END;
$$;

-- Security & RLS Support Functions
CREATE OR REPLACE FUNCTION public.get_user_profile_by_uid()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  doctor_profile doctors%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- If user is a doctor, get doctor profile too
  IF user_profile.role = 'doctor' THEN
    SELECT * INTO doctor_profile FROM doctors WHERE user_id = auth.uid();
    
    RETURN json_build_object(
      'success', true, 
      'profile', row_to_json(user_profile),
      'doctor_profile', row_to_json(doctor_profile)
    );
  END IF;
  
  RETURN json_build_object('success', true, 'profile', row_to_json(user_profile));
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_access(
  resource_type VARCHAR,
  resource_id UUID,
  access_type VARCHAR DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  has_access BOOLEAN := FALSE;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Admin has access to everything
  IF user_profile.role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check access based on resource type
  CASE resource_type
    WHEN 'appointment' THEN
      -- Users can access their own appointments or appointments where they are the doctor
      SELECT EXISTS(
        SELECT 1 FROM appointments a
        LEFT JOIN doctors d ON d.id = a.doctor_id
        WHERE a.id = resource_id 
        AND (a.patient_id = auth.uid() OR d.user_id = auth.uid())
      ) INTO has_access;
      
    WHEN 'treatment_plan' THEN
      -- Users can access their own treatment plans or plans they created as a doctor
      SELECT EXISTS(
        SELECT 1 FROM treatment_plans tp
        LEFT JOIN doctors d ON d.id = tp.doctor_id
        WHERE tp.id = resource_id
        AND (tp.patient_id = auth.uid() OR d.user_id = auth.uid())
      ) INTO has_access;
      
    WHEN 'medical_record' THEN
      -- Users can access their own medical records
      SELECT EXISTS(
        SELECT 1 FROM medical_records mr
        WHERE mr.id = resource_id 
        AND (mr.patient_id = auth.uid() OR mr.added_by = auth.uid())
      ) INTO has_access;
      
    ELSE
      has_access := FALSE;
  END CASE;
  
  RETURN has_access;
END;
$$;

-- Treatment Plan Templates
CREATE OR REPLACE FUNCTION public.create_treatment_plan_template(
  template_name VARCHAR,
  template_description TEXT,
  category VARCHAR DEFAULT 'general',
  template_data JSONB,
  is_public BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_id UUID;
  template_id UUID;
BEGIN
  -- Get doctor ID for current user
  SELECT id INTO doctor_id FROM doctors WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can create templates');
  END IF;
  
  INSERT INTO treatment_plan_templates (
    doctor_id, name, description, category, template_data, is_public
  ) VALUES (
    doctor_id, template_name, template_description, category, template_data, is_public
  ) RETURNING id INTO template_id;
  
  RETURN json_build_object('success', true, 'template_id', template_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_treatment_template(
  template_id UUID,
  patient_id UUID,
  plan_title VARCHAR,
  plan_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_id UUID;
  template_data JSONB;
  new_plan_id UUID;
  procedure_item JSONB;
BEGIN
  -- Get doctor ID for current user
  SELECT id INTO doctor_id FROM doctors WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can assign templates');
  END IF;
  
  -- Get template data
  SELECT tt.template_data INTO template_data 
  FROM treatment_plan_templates tt
  WHERE tt.id = template_id 
  AND (tt.doctor_id = doctor_id OR tt.is_public = TRUE);
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Template not found or access denied');
  END IF;
  
  -- Create new treatment plan
  INSERT INTO treatment_plans (
    doctor_id, patient_id, title, description, status
  ) VALUES (
    doctor_id, patient_id, plan_title, plan_description, 'draft'
  ) RETURNING id INTO new_plan_id;
  
  -- Add procedures from template
  FOR procedure_item IN SELECT * FROM jsonb_array_elements(template_data->'procedures')
  LOOP
    INSERT INTO treatment_plan_procedures (
      treatment_plan_id, procedure_id, cost, notes, sequence_order
    ) VALUES (
      new_plan_id,
      (procedure_item->>'procedure_id')::UUID,
      (procedure_item->>'cost')::NUMERIC,
      procedure_item->>'notes',
      (procedure_item->>'sequence_order')::INTEGER
    );
  END LOOP;
  
  -- Update total cost
  UPDATE treatment_plans SET
    total_cost = (
      SELECT COALESCE(SUM(cost), 0) 
      FROM treatment_plan_procedures 
      WHERE treatment_plan_id = new_plan_id
    )
  WHERE id = new_plan_id;
  
  RETURN json_build_object('success', true, 'treatment_plan_id', new_plan_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.start_treatment_plan(
  treatment_plan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_id UUID;
BEGIN
  -- Get doctor ID for current user
  SELECT id INTO doctor_id FROM doctors WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Only doctors can start treatment plans');
  END IF;
  
  -- Update treatment plan status
  UPDATE treatment_plans SET
    status = 'active',
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = treatment_plan_id AND doctor_id = start_treatment_plan.doctor_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Treatment plan not found or access denied');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Treatment plan started successfully');
END;
$$;