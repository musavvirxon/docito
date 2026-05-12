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
  VALUES (new_conv_id, NEW.referrer_user_id, 'referrer')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  IF NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conv_id, NEW.patient_id, 'patient')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  IF NEW.receiver_user_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conv_id, NEW.receiver_user_id, 'receiver')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_visit_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  conversation_id uuid;
  doctor_user_id uuid;
begin
  if new.patient_id is null then
    return new;
  end if;

  select user_id into doctor_user_id
  from public.doctors
  where id = new.doctor_id;

  if doctor_user_id is null then
    return new;
  end if;

  insert into public.conversations (
    type, name, created_by, context_type, context_id, metadata, is_locked
  )
  values (
    'direct',
    'Appointment Visit',
    doctor_user_id,
    'visit',
    new.id,
    jsonb_build_object(
      'appointment_id', new.id,
      'doctor_id', new.doctor_id,
      'patient_id', new.patient_id
    ),
    false
  )
  returning id into conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (conversation_id, doctor_user_id, 'doctor'),
    (conversation_id, new.patient_id, 'patient')
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$function$;