begin;
create or replace function public.create_visit_conversation()
returns trigger
language plpgsql
security definer
as $$
declare
  doctor_user_id uuid;
begin
  -- Only for confirmed appointments
  if new.status is distinct from 'confirmed' then
    return new;
  end if;

  -- Only if we have a registered patient user
  if new.patient_id is null then
    return new;
  end if;

  -- Avoid duplicates
  if exists (
    select 1
    from public.conversations c
    where c.context_type = 'visit'
      and c.context_id = new.id
    limit 1
  ) then
    return new;
  end if;

  select d.user_id
    into doctor_user_id
  from public.doctors d
  where d.id = new.doctor_id;

  if doctor_user_id is null then
    return new;
  end if;

  insert into public.conversations (type, created_by, context_type, context_id)
  values ('direct', new.patient_id, 'visit', new.id);

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    ((select id from public.conversations where context_type='visit' and context_id=new.id limit 1), new.patient_id, 'patient'),
    ((select id from public.conversations where context_type='visit' and context_id=new.id limit 1), doctor_user_id, 'doctor');

  return new;
end;
$$;

-- Recreate INSERT trigger (confirmed on create)
drop trigger if exists trigger_create_visit_conversation on public.appointments;
create trigger trigger_create_visit_conversation
after insert on public.appointments
for each row
when (new.status = 'confirmed')
execute function public.create_visit_conversation();

-- NEW: UPDATE trigger (pending -> confirmed on patient accept)
drop trigger if exists trigger_create_visit_conversation_on_confirm_update on public.appointments;
create trigger trigger_create_visit_conversation_on_confirm_update
after update of status on public.appointments
for each row
when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
execute function public.create_visit_conversation();

commit;
