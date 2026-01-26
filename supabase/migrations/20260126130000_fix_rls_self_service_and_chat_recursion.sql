-- File: supabase/migrations/20260126130000_fix_rls_self_service_and_chat_recursion.sql
begin;

-- ============================================================
-- 1) Fix infinite recursion in conversation_participants policies
--    by using a SECURITY DEFINER helper with row_security = off
-- ============================================================

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user_id
  );
$$;

grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- Drop and recreate the problematic policies (idempotent)
do $$
begin
  -- conversation_participants
  execute 'drop policy if exists "Users can view participants of their conversations or super_admin" on public.conversation_participants';
  execute 'drop policy if exists "Users can view participants of their conversations (non-recursive)" on public.conversation_participants';
  execute 'drop policy if exists "Users can view participants of their conversations" on public.conversation_participants';
  execute 'drop policy if exists "Users can add participants to conversations they created" on public.conversation_participants';
  execute 'drop policy if exists "Authenticated users can add participants" on public.conversation_participants';
  execute 'drop policy if exists "Users can update their own participation" on public.conversation_participants';
  execute 'drop policy if exists "Users can update their own participation or super_admin" on public.conversation_participants';

  -- conversations
  execute 'drop policy if exists "Users can view conversations they participate in or super_admin" on public.conversations';
  execute 'drop policy if exists "Users can view conversations they participate in" on public.conversations';
  execute 'drop policy if exists "Users can create conversations" on public.conversations';
  execute 'drop policy if exists "Authenticated users can create conversations" on public.conversations';
  execute 'drop policy if exists "Super admin can update conversations" on public.conversations';

  -- messages
  execute 'drop policy if exists "Users can view messages in their conversations or super_admin" on public.messages';
  execute 'drop policy if exists "Users can view messages in their conversations" on public.messages';
  execute 'drop policy if exists "Users can send messages to their conversations" on public.messages';
  execute 'drop policy if exists "Users can send messages to their conversations or super_admin" on public.messages';
  execute 'drop policy if exists "Users can send messages to their conversations (participants)" on public.messages';
  execute 'drop policy if exists "Users can update their own messages" on public.messages';
  execute 'drop policy if exists "Users can update their own messages or super_admin" on public.messages';

  -- Recreate safe policies
  execute $pol$
    create policy "Users can view participants of their conversations (non-recursive)"
    on public.conversation_participants
    for select
    using (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      or public.is_conversation_participant(conversation_participants.conversation_id, auth.uid())
    )
  $pol$;

  execute $pol$
    create policy "Authenticated users can add participants"
    on public.conversation_participants
    for insert
    with check (auth.uid() is not null)
  $pol$;

  execute $pol$
    create policy "Users can update their own participation or super_admin"
    on public.conversation_participants
    for update
    using (
      conversation_participants.user_id = auth.uid()
      or public.has_role(auth.uid(), 'super_admin'::app_role)
    )
    with check (
      conversation_participants.user_id = auth.uid()
      or public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  $pol$;

  execute $pol$
    create policy "Users can view conversations they participate in or super_admin"
    on public.conversations
    for select
    using (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      or public.is_conversation_participant(conversations.id, auth.uid())
    )
  $pol$;

  execute $pol$
    create policy "Authenticated users can create conversations"
    on public.conversations
    for insert
    with check (auth.uid() is not null)
  $pol$;

  execute $pol$
    create policy "Super admin can update conversations"
    on public.conversations
    for update
    using (public.has_role(auth.uid(), 'super_admin'::app_role))
    with check (public.has_role(auth.uid(), 'super_admin'::app_role))
  $pol$;

  execute $pol$
    create policy "Users can view messages in their conversations or super_admin"
    on public.messages
    for select
    using (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      or public.is_conversation_participant(messages.conversation_id, auth.uid())
    )
  $pol$;

  execute $pol$
    create policy "Users can send messages to their conversations"
    on public.messages
    for insert
    with check (
      messages.sender_id = auth.uid()
      and public.is_conversation_participant(messages.conversation_id, auth.uid())
    )
  $pol$;

  execute $pol$
    create policy "Users can update their own messages or super_admin"
    on public.messages
    for update
    using (
      messages.sender_id = auth.uid()
      or public.has_role(auth.uid(), 'super_admin'::app_role)
    )
    with check (
      messages.sender_id = auth.uid()
      or public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  $pol$;
end $$;

-- ============================================================
-- 2) Fix: patient self-service medication INSERT blocked by RLS
--    (drop/recreate medication policies + add created_by_patient)
-- ============================================================

alter table public.medications
  add column if not exists created_by_patient boolean not null default false;

do $$
begin
  -- Drop old policies (idempotent)
  execute 'drop policy if exists "Doctors can manage medications for their treatment plans" on public.medications';
  execute 'drop policy if exists "Patients can view their own medications" on public.medications';
  execute 'drop policy if exists "Patients can add their own medications" on public.medications';
  execute 'drop policy if exists "Patients can update their own self-reported medications" on public.medications';
  execute 'drop policy if exists "Patients can delete their own self-reported medications" on public.medications';

  -- Recreate doctor policy (covers all ops for treatment-plan meds)
  execute $pol$
    create policy "Doctors can manage medications for their treatment plans"
    on public.medications
    for all
    using (
      exists (
        select 1
        from public.treatment_plans tp
        join public.doctors d on d.id = tp.doctor_id
        where tp.id = medications.treatment_plan_id
          and d.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.treatment_plans tp
        join public.doctors d on d.id = tp.doctor_id
        where tp.id = medications.treatment_plan_id
          and d.user_id = auth.uid()
      )
    )
  $pol$;

  -- Patient SELECT
  execute $pol$
    create policy "Patients can view their own medications"
    on public.medications
    for select
    using (medications.patient_id = auth.uid())
  $pol$;

  -- Patient INSERT (self-reported only)
  execute $pol$
    create policy "Patients can add their own medications"
    on public.medications
    for insert
    with check (
      medications.patient_id = auth.uid()
      and medications.created_by_patient = true
      and medications.doctor_id is null
      and medications.treatment_plan_id is null
    )
  $pol$;

  -- Patient UPDATE (self-reported only)
  execute $pol$
    create policy "Patients can update their own self-reported medications"
    on public.medications
    for update
    using (
      medications.patient_id = auth.uid()
      and medications.created_by_patient = true
      and medications.doctor_id is null
      and medications.treatment_plan_id is null
    )
    with check (
      medications.patient_id = auth.uid()
      and medications.created_by_patient = true
      and medications.doctor_id is null
      and medications.treatment_plan_id is null
    )
  $pol$;

  -- Patient DELETE (self-reported only)
  execute $pol$
    create policy "Patients can delete their own self-reported medications"
    on public.medications
    for delete
    using (
      medications.patient_id = auth.uid()
      and medications.created_by_patient = true
      and medications.doctor_id is null
      and medications.treatment_plan_id is null
    )
  $pol$;
end $$;

commit;
