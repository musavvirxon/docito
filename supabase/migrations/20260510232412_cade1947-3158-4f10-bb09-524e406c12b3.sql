CREATE OR REPLACE FUNCTION public.create_referral_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_conv_id uuid;
BEGIN
  IF NEW.referrer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.conversations (type, name, context_type, context_id, created_by)
  VALUES ('group', 'Referral Discussion', 'referral', NEW.id, NEW.referrer_user_id)
  RETURNING id INTO new_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (new_conv_id, NEW.referrer_user_id, 'referrer');

  IF NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conv_id, NEW.patient_id, 'patient');
  END IF;

  IF NEW.receiver_user_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conv_id, NEW.receiver_user_id, 'receiver');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_referral_messaging_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referrer_user_id IS NOT NULL AND NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.referrer_user_id, NEW.patient_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, NEW.referrer_user_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.receiver_user_id IS NOT NULL THEN
    IF NEW.patient_id IS NOT NULL THEN
      INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      VALUES (NEW.receiver_user_id, NEW.patient_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
      INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      VALUES (NEW.patient_id, NEW.receiver_user_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.referrer_user_id IS NOT NULL THEN
      INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      VALUES (NEW.referrer_user_id, NEW.receiver_user_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
      INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      VALUES (NEW.receiver_user_id, NEW.referrer_user_id, 'referral', NEW.id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;