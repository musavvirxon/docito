-- Create all the triggers (policy already exists)

-- Visit conversation trigger
CREATE OR REPLACE FUNCTION public.create_visit_conversation()
RETURNS TRIGGER AS $$
DECLARE
  new_conv_id uuid;
  doctor_user_id uuid;
BEGIN
  SELECT user_id INTO doctor_user_id FROM public.doctors WHERE id = NEW.doctor_id;
  
  IF doctor_user_id IS NOT NULL THEN
    INSERT INTO public.conversations (type, context_type, context_id, created_by)
    VALUES ('direct', 'visit', NEW.id, NEW.patient_id)
    RETURNING id INTO new_conv_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES 
      (new_conv_id, NEW.patient_id, 'patient'),
      (new_conv_id, doctor_user_id, 'doctor');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_visit_conversation ON public.appointments;
CREATE TRIGGER trigger_create_visit_conversation
AFTER INSERT ON public.appointments
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION public.create_visit_conversation();

-- Referral conversation trigger
CREATE OR REPLACE FUNCTION public.create_referral_conversation()
RETURNS TRIGGER AS $$
DECLARE
  new_conv_id uuid;
BEGIN
  INSERT INTO public.conversations (type, name, context_type, context_id, created_by)
  VALUES ('group', 'Referral Discussion', 'referral', NEW.id, NEW.referrer_id)
  RETURNING id INTO new_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (new_conv_id, NEW.referrer_id, 'referrer');

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (new_conv_id, NEW.patient_id, 'patient');

  IF NEW.receiver_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conv_id, NEW.receiver_id, 'receiver');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_referral_conversation ON public.referrals;
CREATE TRIGGER trigger_create_referral_conversation
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_conversation();

-- Lock referral conversation on completion
CREATE OR REPLACE FUNCTION public.lock_referral_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.conversations
    SET is_locked = true, locked_at = now(), locked_reason = 'Referral completed'
    WHERE context_type = 'referral' AND context_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_lock_referral_conversation ON public.referrals;
CREATE TRIGGER trigger_lock_referral_conversation
AFTER UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.lock_referral_conversation();

-- Appointment messaging permission trigger
CREATE OR REPLACE FUNCTION public.create_appointment_messaging_permission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
  SELECT NEW.patient_id, d.user_id, 'appointment', NEW.id
  FROM public.doctors d
  WHERE d.id = NEW.doctor_id AND d.user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
  SELECT d.user_id, NEW.patient_id, 'appointment', NEW.id
  FROM public.doctors d
  WHERE d.id = NEW.doctor_id AND d.user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_appointment_messaging_permission ON public.appointments;
CREATE TRIGGER trigger_appointment_messaging_permission
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_messaging_permission();

-- Referral messaging permission trigger
CREATE OR REPLACE FUNCTION public.create_referral_messaging_permission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
  VALUES (NEW.referrer_id, NEW.patient_id, 'referral', NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
  VALUES (NEW.patient_id, NEW.referrer_id, 'referral', NEW.id)
  ON CONFLICT DO NOTHING;

  IF NEW.receiver_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.receiver_id, NEW.patient_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, NEW.receiver_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.referrer_id, NEW.receiver_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.receiver_id, NEW.referrer_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_referral_messaging_permission ON public.referrals;
CREATE TRIGGER trigger_referral_messaging_permission
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_messaging_permission();

-- Super admin audit access
DROP POLICY IF EXISTS "Super admins can view all conversations for audit" ON public.conversations;
CREATE POLICY "Super admins can view all conversations for audit"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can view all messages for audit" ON public.messages;
CREATE POLICY "Super admins can view all messages for audit"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));