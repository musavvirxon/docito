-- Create function to check if user exists by email/phone
CREATE OR REPLACE FUNCTION public.check_user_exists(p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS TABLE(user_exists BOOLEAN, found_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS user_exists,
    p.user_id AS found_user_id
  FROM profiles p
  WHERE 
    (p_email IS NOT NULL AND LOWER(p.email) = LOWER(p_email))
    OR (p_phone IS NOT NULL AND p.phone = p_phone)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID;
  END IF;
END;
$$;

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_practice_invitation(p_invite_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_staff_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT * INTO v_invitation
  FROM practice_invitations
  WHERE invite_token = p_invite_token
  AND status IN ('pending', 'awaitingSignup')
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM clinic_staff 
    WHERE user_id = v_user_id AND practice_id = v_invitation.practice_id
  ) THEN
    UPDATE practice_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = v_invitation.id;
    RETURN json_build_object('success', false, 'error', 'Already a member of this practice');
  END IF;
  
  INSERT INTO clinic_staff (
    user_id, practice_id, staff_role, status, invited_by,
    can_book_appointments, can_view_medical_records, can_manage_billing, can_manage_patients, can_view_schedule
  ) VALUES (
    v_user_id, v_invitation.practice_id, v_invitation.role, 'active', v_invitation.invited_by,
    v_invitation.role IN ('receptionist', 'nurse', 'admin'),
    v_invitation.role IN ('nurse', 'admin'),
    v_invitation.role IN ('billing_manager', 'admin'),
    v_invitation.role IN ('nurse', 'admin'),
    TRUE
  )
  RETURNING id INTO v_staff_id;
  
  UPDATE practice_invitations
  SET status = 'accepted', accepted_at = NOW(), invited_user_id = v_user_id, updated_at = NOW()
  WHERE id = v_invitation.id;
  
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    v_invitation.invited_by,
    'Invitation Accepted',
    (SELECT full_name FROM profiles WHERE user_id = v_user_id) || ' has joined your practice',
    'invitation',
    v_invitation.id::TEXT,
    'practice_invitation'
  );
  
  RETURN json_build_object('success', true, 'staff_id', v_staff_id, 'practice_id', v_invitation.practice_id, 'role', v_invitation.role);
END;
$$;

-- Create function to create payment hold
CREATE OR REPLACE FUNCTION public.create_appointment_hold(p_appointment_id UUID, p_amount INTEGER, p_currency TEXT DEFAULT 'usd')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hold_id UUID;
  v_appointment RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id AND patient_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Appointment not found');
  END IF;
  
  INSERT INTO payment_holds (user_id, appointment_id, amount, currency, status, hold_expires_at, metadata)
  VALUES (
    v_user_id, p_appointment_id, p_amount, p_currency, 'pending',
    v_appointment.appointment_date::TIMESTAMPTZ + v_appointment.end_time::INTERVAL + INTERVAL '24 hours',
    jsonb_build_object('appointment_date', v_appointment.appointment_date, 'doctor_id', v_appointment.doctor_id)
  )
  RETURNING id INTO v_hold_id;
  
  RETURN json_build_object('success', true, 'hold_id', v_hold_id);
END;
$$;

-- Create function to capture payment hold
CREATE OR REPLACE FUNCTION public.capture_payment_hold(p_hold_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_transaction_id UUID;
BEGIN
  SELECT ph.*, a.doctor_id, a.practice_id INTO v_hold
  FROM payment_holds ph
  JOIN appointments a ON a.id = ph.appointment_id
  WHERE ph.id = p_hold_id AND ph.status = 'held';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Hold not found or not in held status');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = v_hold.doctor_id AND d.user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  UPDATE payment_holds SET status = 'captured', captured_at = NOW(), updated_at = NOW() WHERE id = p_hold_id;
  
  INSERT INTO billing_transactions (user_id, practice_id, appointment_id, payment_hold_id, amount, currency, transaction_type, status, description)
  VALUES (v_hold.user_id, v_hold.practice_id, v_hold.appointment_id, p_hold_id, v_hold.amount, v_hold.currency, 'hold_capture', 'completed', 'Payment captured for completed appointment')
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;

-- Create function to release payment hold
CREATE OR REPLACE FUNCTION public.release_payment_hold(p_hold_id UUID, p_reason TEXT DEFAULT 'cancellation')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_transaction_id UUID;
BEGIN
  SELECT ph.*, a.doctor_id, a.practice_id INTO v_hold
  FROM payment_holds ph
  LEFT JOIN appointments a ON a.id = ph.appointment_id
  WHERE ph.id = p_hold_id AND ph.status = 'held';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Hold not found or not in held status');
  END IF;
  
  IF v_hold.user_id != auth.uid() 
     AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = v_hold.doctor_id AND d.user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  UPDATE payment_holds SET status = 'released', released_at = NOW(), refund_reason = p_reason, updated_at = NOW() WHERE id = p_hold_id;
  
  INSERT INTO billing_transactions (user_id, practice_id, appointment_id, payment_hold_id, amount, currency, transaction_type, status, description)
  VALUES (v_hold.user_id, v_hold.practice_id, v_hold.appointment_id, p_hold_id, v_hold.amount, v_hold.currency, 'hold_release', 'completed', 'Payment hold released: ' || p_reason)
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_practice_invitations_updated_at ON public.practice_invitations;
CREATE TRIGGER update_practice_invitations_updated_at
BEFORE UPDATE ON public.practice_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();

DROP TRIGGER IF EXISTS update_payment_holds_updated_at ON public.payment_holds;
CREATE TRIGGER update_payment_holds_updated_at
BEFORE UPDATE ON public.payment_holds
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();

DROP TRIGGER IF EXISTS update_billing_transactions_updated_at ON public.billing_transactions;
CREATE TRIGGER update_billing_transactions_updated_at
BEFORE UPDATE ON public.billing_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_dental_updated_at();