-- Enhance existing referrals table for universal referral system

-- First, create new enums if they don't exist
DO $$ BEGIN
  CREATE TYPE public.referral_type AS ENUM (
    'consultation',
    'lab_test',
    'imaging_study',
    'prescription_fulfillment',
    'follow_up_care',
    'specialist_referral'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_priority AS ENUM (
    'routine',
    'urgent',
    'stat'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_entity_type AS ENUM (
    'doctor',
    'clinic',
    'lab',
    'imaging_center',
    'pharmacy'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to referrals table
ALTER TABLE public.referrals 
  ADD COLUMN IF NOT EXISTS referral_number VARCHAR DEFAULT ('REF-' || substr((gen_random_uuid())::text, 1, 8)),
  ADD COLUMN IF NOT EXISTS referrer_type referral_entity_type DEFAULT 'doctor',
  ADD COLUMN IF NOT EXISTS referrer_entity_id UUID,
  ADD COLUMN IF NOT EXISTS referrer_user_id UUID,
  ADD COLUMN IF NOT EXISTS receiver_type referral_entity_type DEFAULT 'doctor',
  ADD COLUMN IF NOT EXISTS receiver_entity_id UUID,
  ADD COLUMN IF NOT EXISTS receiver_user_id UUID,
  ADD COLUMN IF NOT EXISTS referral_type_enum referral_type DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS priority referral_priority DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS diagnosis_codes TEXT[],
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS preferred_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS insurance_provider_id UUID,
  ADD COLUMN IF NOT EXISTS insurance_plan_id UUID,
  ADD COLUMN IF NOT EXISTS pre_authorization_number VARCHAR,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID,
  ADD COLUMN IF NOT EXISTS result_notes TEXT,
  ADD COLUMN IF NOT EXISTS result_attachments JSONB DEFAULT '[]'::jsonb;

-- Create referral_slots table
CREATE TABLE IF NOT EXISTS public.referral_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_reserved BOOLEAN NOT NULL DEFAULT false,
  reserved_at TIMESTAMPTZ,
  reserved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_appointments table
CREATE TABLE IF NOT EXISTS public.referral_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referral_slot_id UUID REFERENCES public.referral_slots(id),
  appointment_id UUID REFERENCES public.appointments(id),
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'scheduled',
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  booked_by UUID NOT NULL,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_audit_log table
CREATE TABLE IF NOT EXISTS public.referral_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  actor_id UUID NOT NULL,
  actor_role VARCHAR,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_notifications table
CREATE TABLE IF NOT EXISTS public.referral_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  notification_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  channel VARCHAR NOT NULL DEFAULT 'in_app',
  sent_at TIMESTAMPTZ,
  delivery_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON public.referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_type, referrer_entity_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiver ON public.referrals(receiver_type, receiver_entity_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_priority ON public.referrals(priority);
CREATE INDEX IF NOT EXISTS idx_referral_slots_referral ON public.referral_slots(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_appointments_referral ON public.referral_appointments(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_notifications_recipient ON public.referral_notifications(recipient_id, is_read);

-- Enable RLS on new tables
ALTER TABLE public.referral_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_slots
CREATE POLICY "Users can view slots for their referrals"
ON public.referral_slots FOR SELECT
USING (
  referral_id IN (
    SELECT id FROM referrals 
    WHERE patient_id = auth.uid() 
    OR referrer_user_id = auth.uid()
    OR referring_doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Receivers can manage slots"
ON public.referral_slots FOR ALL
USING (
  referral_id IN (
    SELECT id FROM referrals r
    WHERE r.referred_doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR (r.receiver_type = 'doctor' AND r.receiver_entity_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (r.receiver_type = 'clinic' AND r.receiver_entity_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'lab' AND r.receiver_entity_id IN (SELECT id FROM lab_centers WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'imaging_center' AND r.receiver_entity_id IN (SELECT id FROM imaging_centers WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'pharmacy' AND r.receiver_entity_id IN (SELECT id FROM pharmacies WHERE admin_id = auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all slots"
ON public.referral_slots FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for referral_appointments
CREATE POLICY "Patients can view their referral appointments"
ON public.referral_appointments FOR SELECT
USING (
  referral_id IN (SELECT id FROM referrals WHERE patient_id = auth.uid())
);

CREATE POLICY "Patients can book referral appointments"
ON public.referral_appointments FOR INSERT
WITH CHECK (
  referral_id IN (SELECT id FROM referrals WHERE patient_id = auth.uid())
  AND booked_by = auth.uid()
);

CREATE POLICY "Referrers can view referral appointments"
ON public.referral_appointments FOR SELECT
USING (
  referral_id IN (
    SELECT id FROM referrals 
    WHERE referrer_user_id = auth.uid()
    OR referring_doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Receivers can manage referral appointments"
ON public.referral_appointments FOR ALL
USING (
  referral_id IN (
    SELECT id FROM referrals r
    WHERE r.referred_doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR (r.receiver_type = 'doctor' AND r.receiver_entity_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (r.receiver_type = 'clinic' AND r.receiver_entity_id IN (SELECT id FROM practices WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'lab' AND r.receiver_entity_id IN (SELECT id FROM lab_centers WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'imaging_center' AND r.receiver_entity_id IN (SELECT id FROM imaging_centers WHERE admin_id = auth.uid()))
    OR (r.receiver_type = 'pharmacy' AND r.receiver_entity_id IN (SELECT id FROM pharmacies WHERE admin_id = auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all referral appointments"
ON public.referral_appointments FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS for audit log
CREATE POLICY "Users can view audit for their referrals"
ON public.referral_audit_log FOR SELECT
USING (
  referral_id IN (
    SELECT id FROM referrals 
    WHERE patient_id = auth.uid() 
    OR referrer_user_id = auth.uid()
    OR referring_doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Super admins can view all audit logs"
ON public.referral_audit_log FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- RLS for notifications
CREATE POLICY "Users can view their notifications"
ON public.referral_notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.referral_notifications FOR UPDATE
USING (recipient_id = auth.uid());

CREATE POLICY "Super admins can manage all notifications"
ON public.referral_notifications FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Additional RLS policies for enhanced referrals table
DROP POLICY IF EXISTS "Clinic staff can view practice referrals" ON public.referrals;
CREATE POLICY "Clinic staff can view practice referrals"
ON public.referrals FOR SELECT
USING (
  receiver_type = 'clinic' AND 
  receiver_entity_id IN (
    SELECT practice_id FROM clinic_staff 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Lab staff can view lab referrals" ON public.referrals;
CREATE POLICY "Lab staff can view lab referrals"
ON public.referrals FOR SELECT
USING (
  receiver_type = 'lab' AND 
  receiver_entity_id IN (
    SELECT lab_center_id FROM lab_staff 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Imaging staff can view imaging referrals" ON public.referrals;
CREATE POLICY "Imaging staff can view imaging referrals"
ON public.referrals FOR SELECT
USING (
  receiver_type = 'imaging_center' AND 
  receiver_entity_id IN (
    SELECT imaging_center_id FROM imaging_staff 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Pharmacy staff can view pharmacy referrals" ON public.referrals;
CREATE POLICY "Pharmacy staff can view pharmacy referrals"
ON public.referrals FOR SELECT
USING (
  receiver_type = 'pharmacy' AND 
  receiver_entity_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Function to log referral actions
CREATE OR REPLACE FUNCTION public.log_referral_action(
  p_referral_id UUID,
  p_action VARCHAR,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_role VARCHAR;
BEGIN
  SELECT role::VARCHAR INTO v_user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO referral_audit_log (
    referral_id, action, actor_id, actor_role,
    old_values, new_values, notes
  ) VALUES (
    p_referral_id, p_action, auth.uid(), v_user_role,
    p_old_values, p_new_values, p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to create referral notification
CREATE OR REPLACE FUNCTION public.create_referral_notification(
  p_referral_id UUID,
  p_recipient_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO referral_notifications (
    referral_id, recipient_id, notification_type,
    title, message, sent_at, delivery_status
  ) VALUES (
    p_referral_id, p_recipient_id, p_type,
    p_title, p_message, now(), 'sent'
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;