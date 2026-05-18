CREATE OR REPLACE FUNCTION public.create_visit_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_conversation_id uuid;
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
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (v_conversation_id, doctor_user_id, 'doctor'),
    (v_conversation_id, new.patient_id, 'patient')
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$function$;