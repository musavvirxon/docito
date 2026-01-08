-- Fix referral conversation + messaging permission triggers to use the universal referral columns
-- (referrer_user_id / receiver_user_id / referrer_entity_id / receiver_entity_id)
--
-- This migration replaces older trigger functions that referenced legacy columns
-- (referrer_id / receiver_id).

-- Resolve a user_id for a referral entity.
-- Only doctors have a direct user_id in this schema. Other entity types can be
-- added later if/when they get a single canonical messaging user.
CREATE OR REPLACE FUNCTION public.resolve_referral_entity_user_id(
  p_entity_type public.referral_entity_type,
  p_entity_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_entity_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_entity_type = 'doctor' THEN
    SELECT d.user_id INTO v_user_id
    FROM public.doctors d
    WHERE d.id = p_entity_id;

    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Create a referral conversation using the correct columns.
CREATE OR REPLACE FUNCTION public.create_referral_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  v_referrer_user_id uuid;
  v_receiver_user_id uuid;
  v_created_by uuid;
BEGIN
  v_referrer_user_id := COALESCE(
    NEW.referrer_user_id,
    public.resolve_referral_entity_user_id(NEW.referrer_type, NEW.referrer_entity_id)
  );

  v_receiver_user_id := COALESCE(
    NEW.receiver_user_id,
    public.resolve_referral_entity_user_id(NEW.receiver_type, NEW.receiver_entity_id)
  );

  v_created_by := COALESCE(v_referrer_user_id, NEW.patient_id);

  -- If we don't have a creator, don't create a conversation.
  IF v_created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.conversations (type, name, context_type, context_id, created_by)
  VALUES ('group', 'Referral Discussion', 'referral', NEW.id, v_created_by)
  RETURNING id INTO new_conv_id;

  -- Add participants (distinct, skipping NULLs)
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  SELECT * FROM (
    VALUES
      (new_conv_id, v_referrer_user_id, 'referrer'),
      (new_conv_id, NEW.patient_id, 'patient'),
      (new_conv_id, v_receiver_user_id, 'receiver')
  ) AS v(conversation_id, user_id, role)
  WHERE v.user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_referral_conversation ON public.referrals;
CREATE TRIGGER trigger_create_referral_conversation
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_conversation();

-- Create messaging permissions for referral participants using the correct columns.
CREATE OR REPLACE FUNCTION public.create_referral_messaging_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id uuid;
  v_receiver_user_id uuid;
BEGIN
  v_referrer_user_id := COALESCE(
    NEW.referrer_user_id,
    public.resolve_referral_entity_user_id(NEW.referrer_type, NEW.referrer_entity_id)
  );

  v_receiver_user_id := COALESCE(
    NEW.receiver_user_id,
    public.resolve_referral_entity_user_id(NEW.receiver_type, NEW.receiver_entity_id)
  );

  -- Patient <-> Referrer
  IF NEW.patient_id IS NOT NULL AND v_referrer_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_referrer_user_id, NEW.patient_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, v_referrer_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Patient <-> Receiver
  IF NEW.patient_id IS NOT NULL AND v_receiver_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_receiver_user_id, NEW.patient_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (NEW.patient_id, v_receiver_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Referrer <-> Receiver
  IF v_referrer_user_id IS NOT NULL AND v_receiver_user_id IS NOT NULL THEN
    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_referrer_user_id, v_receiver_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    VALUES (v_receiver_user_id, v_referrer_user_id, 'referral', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_messaging_permission ON public.referrals;
CREATE TRIGGER trigger_referral_messaging_permission
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_messaging_permission();
