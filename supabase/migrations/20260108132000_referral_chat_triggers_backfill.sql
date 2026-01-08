begin;

-- ============================================================
-- Referral Chat Automation: conversations + participants + perms
-- ============================================================

-- If you use gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Helper: ensure conversation exists for a referral
-- ------------------------------------------------------------
-- This function supports two possible schemas:
--   A) referrals has conversation_id (UUID)
--   B) conversations has referral_id (UUID)
--
-- If your schema is only one of these, it still works.

create or replace function public.ensure_referral_conversation(p_referral_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_conversation_id uuid;
  v_ref record;
begin
  -- Load referral
  select
    r.id,
    r.patient_id,
    r.referrer_user_id,
    r.receiver_user_id,
    -- If this column exists in your schema, great. If not, the SELECT will fail.
    -- We'll handle via exception below.
    r.conversation_id
  into v_ref
  from public.referrals r
  where r.id = p_referral_id;

  if not found then
    raise exception 'Referral % not found', p_referral_id;
  end if;

  -- Try schema A: referrals.conversation_id exists and is set
  begin
    if v_ref.conversation_id is not null then
      return v_ref.conversation_id;
    end if;
  exception when undefined_column then
    -- referrals.conversation_id does not exist -> ignore, we will use schema B
    null;
  end;

  -- Try schema B: conversations has referral_id
  begin
    select c.id
      into v_conversation_id
    from public.conversations c
    where c.referral_id = p_referral_id
    limit 1;

    if v_conversation_id is not null then
      -- If schema A exists too, backfill referrals.conversation_id
      begin
        update public.referrals
          set conversation_id = v_conversation_id
        where id = p_referral_id
          and conversation_id is null;
      exception when undefined_column then
        null;
      end;

      return v_conversation_id;
    end if;
  exception when undefined_column then
    -- conversations.referral_id does not exist.
    -- In that case you MUST have referrals.conversation_id or some other mapping.
    -- We'll create a conversation and attempt to set referrals.conversation_id.
    null;
  end;

  -- Create new conversation
  v_conversation_id := gen_random_uuid();

  -- Insert into conversations.
  -- Adjust column names here if your conversations schema differs.
  insert into public.conversations (
    id,
    created_at,
    created_by,
    conversation_type,
    referral_id
  ) values (
    v_conversation_id,
    now(),
    coalesce(v_ref.referrer_user_id, v_ref.patient_id),
    'referral',
    p_referral_id
  );

  -- If referrals.conversation_id exists, store it
  begin
    update public.referrals
      set conversation_id = v_conversation_id
    where id = p_referral_id
      and conversation_id is null;
  exception when undefined_column then
    null;
  end;

  return v_conversation_id;
end;
$$;

-- ------------------------------------------------------------
-- 2) Helper: upsert participant
-- ------------------------------------------------------------
create or replace function public.ensure_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_user_id is null then
    return;
  end if;

  -- Adjust columns if your table differs.
  insert into public.conversation_participants (
    conversation_id,
    user_id,
    role,
    created_at
  )
  values (
    p_conversation_id,
    p_user_id,
    p_role,
    now()
  )
  on conflict (conversation_id, user_id)
  do update set
    role = coalesce(excluded.role, conversation_participants.role);
end;
$$;

-- ------------------------------------------------------------
-- 3) Helper: upsert messaging permissions (pairwise)
-- ------------------------------------------------------------
-- If you don’t use messaging_permissions table, skip this function.
create or replace function public.ensure_message_permission_pair(
  p_conversation_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if p_user_a is null or p_user_b is null then
    return;
  end if;

  -- A -> B
  insert into public.messaging_permissions (
    conversation_id,
    sender_id,
    recipient_id,
    can_message,
    created_at
  )
  values (
    p_conversation_id,
    p_user_a,
    p_user_b,
    true,
    now()
  )
  on conflict (conversation_id, sender_id, recipient_id)
  do update set can_message = true;

  -- B -> A
  insert into public.messaging_permissions (
    conversation_id,
    sender_id,
    recipient_id,
    can_message,
    created_at
  )
  values (
    p_conversation_id,
    p_user_b,
    p_user_a,
    true,
    now()
  )
  on conflict (conversation_id, sender_id, recipient_id)
  do update set can_message = true;
end;
$$;

-- ------------------------------------------------------------
-- 4) Trigger function: after INSERT referral
-- ------------------------------------------------------------
create or replace function public.tg_referrals_after_insert_chat()
returns trigger
language plpgsql
security definer
as $$
declare
  v_conversation_id uuid;
begin
  v_conversation_id := public.ensure_referral_conversation(new.id);

  -- Participants: patient + referrer user + receiver user (if already set)
  perform public.ensure_conversation_participant(v_conversation_id, new.patient_id, 'patient');
  perform public.ensure_conversation_participant(v_conversation_id, new.referrer_user_id, 'referrer');
  perform public.ensure_conversation_participant(v_conversation_id, new.receiver_user_id, 'receiver');

  -- Permissions (pairwise). If you don’t want patient<->referrer messaging, remove it.
  perform public.ensure_message_permission_pair(v_conversation_id, new.patient_id, new.referrer_user_id);
  perform public.ensure_message_permission_pair(v_conversation_id, new.patient_id, new.receiver_user_id);
  perform public.ensure_message_permission_pair(v_conversation_id, new.referrer_user_id, new.receiver_user_id);

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5) Trigger function: after UPDATE referral (receiver_user_id changes)
-- ------------------------------------------------------------
create or replace function public.tg_referrals_after_update_chat()
returns trigger
language plpgsql
security definer
as $$
declare
  v_conversation_id uuid;
begin
  -- Only react when receiver_user_id was set/changed
  if (new.receiver_user_id is distinct from old.receiver_user_id) then
    v_conversation_id := public.ensure_referral_conversation(new.id);

    perform public.ensure_conversation_participant(v_conversation_id, new.receiver_user_id, 'receiver');

    perform public.ensure_message_permission_pair(v_conversation_id, new.patient_id, new.receiver_user_id);
    perform public.ensure_message_permission_pair(v_conversation_id, new.referrer_user_id, new.receiver_user_id);
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 6) Attach triggers (idempotent)
-- ------------------------------------------------------------
drop trigger if exists referrals_after_insert_chat on public.referrals;
create trigger referrals_after_insert_chat
after insert on public.referrals
for each row
execute function public.tg_referrals_after_insert_chat();

drop trigger if exists referrals_after_update_chat on public.referrals;
create trigger referrals_after_update_chat
after update on public.referrals
for each row
execute function public.tg_referrals_after_update_chat();

-- ------------------------------------------------------------
-- 7) Backfill/repair existing data (safe to re-run)
-- ------------------------------------------------------------
do $$
declare
  r record;
  v_conversation_id uuid;
begin
  for r in
    select id, patient_id, referrer_user_id, receiver_user_id
    from public.referrals
  loop
    v_conversation_id := public.ensure_referral_conversation(r.id);

    perform public.ensure_conversation_participant(v_conversation_id, r.patient_id, 'patient');
    perform public.ensure_conversation_participant(v_conversation_id, r.referrer_user_id, 'referrer');
    perform public.ensure_conversation_participant(v_conversation_id, r.receiver_user_id, 'receiver');

    perform public.ensure_message_permission_pair(v_conversation_id, r.patient_id, r.referrer_user_id);
    perform public.ensure_message_permission_pair(v_conversation_id, r.patient_id, r.receiver_user_id);
    perform public.ensure_message_permission_pair(v_conversation_id, r.referrer_user_id, r.receiver_user_id);
  end loop;
end $$;

commit;
