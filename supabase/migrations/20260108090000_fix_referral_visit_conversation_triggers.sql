begin;

-- -----------------------------------------------------------------------------
-- Fix healthcare messaging triggers + conversation schema to match the app code.
--
-- Problems fixed:
-- 1) Triggers referenced legacy referral columns (referrer_id / receiver_id).
-- 2) Triggers inserted conversation_participants roles that violated CHECK.
-- 3) conversations.type CHECK only allowed ('direct','group'), but app uses
--    context-driven types (visit/referral) and expects columns (context_type,...)
-- -----------------------------------------------------------------------------

-- Ensure conversations has the columns used by the application
alter table public.conversations
  add column if not exists context_type text,
  add column if not exists context_id uuid,
  add column if not exists is_locked boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_reason text;

-- Expand conversations.type CHECK to include visit/referral (while keeping existing values)
alter table public.conversations drop constraint if exists conversations_type_check;
alter table public.conversations
  add constraint conversations_type_check
  check (type in ('direct', 'group', 'visit', 'referral'));

-- Expand conversation_participants.role CHECK to allow healthcare roles
alter table public.conversation_participants drop constraint if exists conversation_participants_role_check;
alter table public.conversation_participants
  add constraint conversation_participants_role_check
  check (role in ('admin', 'member', 'patient', 'doctor', 'referrer', 'receiver'));

-- -----------------------------------------------------------------------------
-- Visit conversation trigger
-- -----------------------------------------------------------------------------

create or replace function public.create_visit_conversation()
returns trigger as $$
declare
  new_conv_id uuid;
  doctor_user_id uuid;
begin
  select user_id into doctor_user_id
  from public.doctors
  where id = new.doctor_id;

  if doctor_user_id is not null then
    insert into public.conversations (type, context_type, context_id, created_by)
    values ('direct', 'visit', new.id, new.patient_id)
    returning id into new_conv_id;

    insert into public.conversation_participants (conversation_id, user_id, role)
    values
      (new_conv_id, new.patient_id, 'patient'),
      (new_conv_id, doctor_user_id, 'doctor')
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trigger_create_visit_conversation on public.appointments;
create trigger trigger_create_visit_conversation
after insert on public.appointments
for each row
when (new.status = 'confirmed')
execute function public.create_visit_conversation();

-- -----------------------------------------------------------------------------
-- Referral conversation trigger (universal referrals table)
-- -----------------------------------------------------------------------------

create or replace function public.create_referral_conversation()
returns trigger as $$
declare
  new_conv_id uuid;
begin
  -- Create the conversation under the referrer user
  insert into public.conversations (type, name, context_type, context_id, created_by)
  values ('group', 'Referral Discussion', 'referral', new.id, new.referrer_user_id)
  returning id into new_conv_id;

  -- Referrer, patient and (if known) receiver become participants
  if new.referrer_user_id is not null then
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (new_conv_id, new.referrer_user_id, 'referrer')
    on conflict do nothing;
  end if;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (new_conv_id, new.patient_id, 'patient')
  on conflict do nothing;

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

-- -----------------------------------------------------------------------------
-- Lock referral conversation on completion
-- -----------------------------------------------------------------------------

create or replace function public.lock_referral_conversation()
returns trigger as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.conversations
    set is_locked = true,
        locked_at = now(),
        locked_reason = 'Referral completed'
    where context_type = 'referral' and context_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trigger_lock_referral_conversation on public.referrals;
create trigger trigger_lock_referral_conversation
after update on public.referrals
for each row
execute function public.lock_referral_conversation();

-- -----------------------------------------------------------------------------
-- Referral messaging permission trigger (universal referrals table)
-- -----------------------------------------------------------------------------

create or replace function public.create_referral_messaging_permission()
returns trigger as $$
begin
  -- Referrer <-> patient
  if new.referrer_user_id is not null then
    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.referrer_user_id, new.patient_id, 'referral', new.id)
    on conflict do nothing;

    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.patient_id, new.referrer_user_id, 'referral', new.id)
    on conflict do nothing;
  end if;

  -- Receiver <-> patient and receiver <-> referrer (when receiver user is known)
  if new.receiver_user_id is not null then
    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.receiver_user_id, new.patient_id, 'referral', new.id)
    on conflict do nothing;

    insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
    values (new.patient_id, new.receiver_user_id, 'referral', new.id)
    on conflict do nothing;

    if new.referrer_user_id is not null then
      insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      values (new.referrer_user_id, new.receiver_user_id, 'referral', new.id)
      on conflict do nothing;

      insert into public.messaging_permissions (user_id, can_message_user_id, permission_type, context_id)
      values (new.receiver_user_id, new.referrer_user_id, 'referral', new.id)
      on conflict do nothing;
    end if;
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
