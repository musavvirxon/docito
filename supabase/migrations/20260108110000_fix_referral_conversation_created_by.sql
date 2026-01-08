begin;

-- Ensure referral conversations can be created even when referrer_user_id is NULL.
-- Fallback created_by to patient_id.

create or replace function public.create_referral_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conv_id uuid;
  v_created_by uuid;
begin
  v_created_by := coalesce(new.referrer_user_id, new.patient_id);

  -- If we don't have a creator, do nothing.
  if v_created_by is null then
    return new;
  end if;

  insert into public.conversations (type, name, context_type, context_id, created_by)
  values ('group', 'Referral Discussion', 'referral', new.id, v_created_by)
  returning id into new_conv_id;

  -- Add participants (defensive; skip NULLs)
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
$$;

drop trigger if exists trigger_create_referral_conversation on public.referrals;
create trigger trigger_create_referral_conversation
after insert on public.referrals
for each row
execute function public.create_referral_conversation();

commit;
