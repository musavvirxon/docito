-- File: supabase/migrations/20260126123000_fix_conversation_participants_rls_and_patient_medications.sql
begin;

-- ============================================================
-- 1) FIX: conversation_participants SELECT policy recursion
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

do $$
declare
  pol text;
begin
  -- Drop known recursive/older policies if they exist
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversation_participants'
      and policyname in (
        'Users can view participants of their conversations or super_admin',
        'Users can view participants of their conversations',
        'Users can view participants of their conversations or super_admin (v2)',
        'Users can view participants of their conversations (v2)'
      )
  loop
    execute format('drop policy if exists %I on public.conversation_participants', pol);
  end loop;

  -- Recreate a non-recursive SELECT policy (uses security definer helper)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversation_participants'
      and policyname = 'Users can view participants of their conversations (non-recursive)'
  ) then
    execute $pol$
      create policy "Users can view participants of their conversations (non-recursive)"
      on public.conversation_participants
      for select
      using (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        or public.is_conversation_participant(conversation_participants.conversation_id, auth.uid())
      )
    $pol$;
  end if;
end $$;

-- ============================================================
-- 2) Allow patients to add their own medications (self-reported)
-- ============================================================

alter table public.medications
  add column if not exists created_by_patient boolean not null default false;

do $$
begin
  -- Patients can INSERT self-reported medications
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'medications'
      and policyname = 'Patients can add their own medications'
  ) then
    execute $pol$
      create policy "Patients can add their own medications"
      on public.medications
      for insert
      with check (
        patient_id = auth.uid()
        and created_by_patient = true
        and doctor_id is null
        and treatment_plan_id is null
      )
    $pol$;
  end if;

  -- Patients can UPDATE self-reported medications
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'medications'
      and policyname = 'Patients can update their own self-reported medications'
  ) then
    execute $pol$
      create policy "Patients can update their own self-reported medications"
      on public.medications
      for update
      using (
        patient_id = auth.uid()
        and created_by_patient = true
      )
      with check (
        patient_id = auth.uid()
        and created_by_patient = true
        and doctor_id is null
        and treatment_plan_id is null
      )
    $pol$;
  end if;

  -- Patients can DELETE self-reported medications
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'medications'
      and policyname = 'Patients can delete their own self-reported medications'
  ) then
    execute $pol$
      create policy "Patients can delete their own self-reported medications"
      on public.medications
      for delete
      using (
        patient_id = auth.uid()
        and created_by_patient = true
      )
    $pol$;
  end if;
end $$;

commit;
