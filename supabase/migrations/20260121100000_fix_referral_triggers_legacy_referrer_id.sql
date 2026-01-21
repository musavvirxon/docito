begin;

create or replace function public.create_referral_conversation()
returns trigger as $$
declare
  new_conv_id uuid;
  v_created_by uuid;
begin
  v_created_by := coalesce(new.referrer_user_id, new.patient_id);

  insert into public.conversations (type, name, context_type, context_id, created_by)
  values ('group', 'Referral Discussion', 'referral', new.id, v_created_by)
  returning id into new_conv_id;

  if new.referrer_user_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (new_conv_id, new.referrer_user_id, 'referrer')
    on conflict do nothing;
  end if;

  if new.patient_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (new_conv_id, new.patient_id, 'patient')
    on conflict do nothing;
  end if;

  if new.receiver_user_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (new_conv_id, new.receiver_user_id, 'receiver')
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trigger_create_referral_conversation on public.referrals;
create trigger trigger_create_referral_conversation
after insert on public.referrals
for each row
execute function public.create_referral_conversation();

-- Referral messaging permission trigger (universal referrals table)
create or replace function public.create_referral_messaging_permission()
returns trigger as $$
begin
  -- Referrer <-> patient
  if new.patient_id is not null and new.referrer_user_id is not null then
    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.referrer_user_id, new.patient_id, 'referral', new.id)
    on conflict do nothing;

    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.patient_id, new.referrer_user_id, 'referral', new.id)
    on conflict do nothing;
  end if;

  -- Receiver <-> patient
  if new.patient_id is not null and new.receiver_user_id is not null then
    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.receiver_user_id, new.patient_id, 'referral', new.id)
    on conflict do nothing;

    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.patient_id, new.receiver_user_id, 'referral', new.id)
    on conflict do nothing;
  end if;

  -- Referrer <-> receiver (if both known)
  if new.referrer_user_id is not null and new.receiver_user_id is not null then
    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.referrer_user_id, new.receiver_user_id, 'referral', new.id)
    on conflict do nothing;

    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.receiver_user_id, new.referrer_user_id, 'referral', new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trigger_referral_messaging_permission on public.referrals;
create trigger trigger_referral_messaging_permission
after insert on public.referrals
for each row
execute function public.create_referral_messaging_permission();

commit;
