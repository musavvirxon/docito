begin;

-- -----------------------------------------------------------------------------
-- When a referral is created, receiver_user_id is often NULL for entity receivers
-- (lab/pharmacy/imaging/clinic). Later, when the receiver acts, the app sets
-- receiver_user_id = auth.uid().
--
-- This migration ensures that when receiver_user_id transitions from NULL -> uuid:
--  1) The user is added to the referral conversation participants
--  2) Messaging permissions are created between receiver<->patient, receiver<->referrer
-- -----------------------------------------------------------------------------

-- Helper: ensure a participant exists
create or replace function public.ensure_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_conversation_id is null or p_user_id is null then
    return;
  end if;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (p_conversation_id, p_user_id, p_role)
  on conflict do nothing;
end;
$$;

-- Helper: ensure messaging permission exists
create or replace function public.ensure_messaging_permission(
  p_user_id uuid,
  p_can_message_user_id uuid,
  p_permission_type text,
  p_context_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_can_message_user_id is null then
    return;
  end if;

  insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
  values (p_user_id, p_can_message_user_id, p_permission_type, p_context_id)
  on conflict do nothing;
end;
$$;

-- Main function: when receiver_user_id becomes set, attach to existing conversation + permissions
create or replace function public.attach_receiver_user_to_referral_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  -- Only act when receiver_user_id changes from NULL -> NOT NULL
  if old.receiver_user_id is null and new.receiver_user_id is not null then

    -- Find the referral conversation (created on insert)
    select id into v_conversation_id
    from public.conversations
    where context_type = 'referral'
      and context_id = new.id
    limit 1;

    -- Add receiver as participant
    perform public.ensure_conversation_participant(v_conversation_id, new.receiver_user_id, 'receiver');

    -- Ensure patient is participant too (defensive)
    perform public.ensure_conversation_participant(v_conversation_id, new.patient_id, 'patient');

    -- Ensure referrer is participant too (defensive)
    if new.referrer_user_id is not null then
      perform public.ensure_conversation_participant(v_conversation_id, new.referrer_user_id, 'referrer');
    end if;

    -- Messaging permissions:
    -- receiver <-> patient
    perform public.ensure_messaging_permission(new.receiver_user_id, new.patient_id, 'referral', new.id);
    perform public.ensure_messaging_permission(new.patient_id, new.receiver_user_id, 'referral', new.id);

    -- receiver <-> referrer (if available)
    if new.referrer_user_id is not null then
      perform public.ensure_messaging_permission(new.receiver_user_id, new.referrer_user_id, 'referral', new.id);
      perform public.ensure_messaging_permission(new.referrer_user_id, new.receiver_user_id, 'referral', new.id);
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists trigger_attach_receiver_user_to_referral_conversation on public.referrals;
create trigger trigger_attach_receiver_user_to_referral_conversation
after update of receiver_user_id on public.referrals
for each row
execute function public.attach_receiver_user_to_referral_conversation();

commit;
