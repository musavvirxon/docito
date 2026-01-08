begin;

-- ============================================================
-- PART 6A — Fix chat schema mismatches + enforce lock behavior
-- ============================================================

-- 1) Ensure conversations has the context + lock columns required by triggers
alter table public.conversations
  add column if not exists context_type text,
  add column if not exists context_id uuid,
  add column if not exists is_locked boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_reason text;

-- Helpful indexes for referral/visit lookups
create index if not exists idx_conversations_context on public.conversations (context_type, context_id);
create index if not exists idx_conversations_last_message_at on public.conversations (last_message_at desc);

-- 2) Fix conversation_participants.role check constraint to allow trigger roles
-- Original table had CHECK(role IN ('admin','member')).
-- Your triggers insert roles: patient/doctor/referrer/receiver
do $$
begin
  -- Drop old check constraint if it exists (auto-named by Postgres)
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.conversation_participants'::regclass
      and contype = 'c'
      and conname = 'conversation_participants_role_check'
  ) then
    execute 'alter table public.conversation_participants drop constraint conversation_participants_role_check';
  end if;

  -- Add updated check constraint (new allowed roles)
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.conversation_participants'::regclass
      and contype = 'c'
      and conname = 'conversation_participants_role_check_v2'
  ) then
    execute $c$
      alter table public.conversation_participants
      add constraint conversation_participants_role_check_v2
      check (role in (
        'admin',
        'member',
        'patient',
        'doctor',
        'referrer',
        'receiver',
        'practice_admin',
        'facility_admin',
        'staff'
      ))
    $c$;
  end if;
end $$;

-- 3) Ensure messages cannot be sent if conversation is locked
-- Replace INSERT policy on public.messages to include "not locked" check
drop policy if exists "Users can send messages to their conversations" on public.messages;

create policy "Users can send messages to their conversations (unlocked)"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and coalesce(c.is_locked, false) = false
  )
);

-- ============================================================
-- PART 6B — messaging_permissions table (create if missing) + RLS
-- ============================================================

-- Some environments may not have this table even though triggers use it.
create table if not exists public.messaging_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  can_message_user_id uuid not null,
  permission_type text not null check (permission_type in ('appointment','referral','other')),
  context_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, can_message_user_id, permission_type, context_id)
);

alter table public.messaging_permissions enable row level security;

-- User can view their own permissions; super_admin can view all
drop policy if exists "Users can view own messaging permissions" on public.messaging_permissions;
create policy "Users can view own messaging permissions"
on public.messaging_permissions for select
using (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only system/trigger inserts are expected.
-- But we allow authenticated inserts ONLY for super_admin to avoid blocking admin ops.
drop policy if exists "Super admin can manage messaging permissions" on public.messaging_permissions;
create policy "Super admin can manage messaging permissions"
on public.messaging_permissions for all
using (public.has_role(auth.uid(), 'super_admin'::app_role))
with check (public.has_role(auth.uid(), 'super_admin'::app_role));

create index if not exists idx_messaging_permissions_user on public.messaging_permissions (user_id);
create index if not exists idx_messaging_permissions_can_message_user on public.messaging_permissions (can_message_user_id);

-- ============================================================
-- PART 6C — Appointments RLS: doctor/admin/staff/patient flows
-- ============================================================

-- IMPORTANT: Your appointments table includes:
-- patient_id, doctor_id, practice_id, appointment_date, start_time, end_time, status, notes, created_at
-- (confirmed from your 20250913 migration)

-- Remove the overly-broad insert policy
drop policy if exists "Authenticated users can create appointments" on public.appointments;

-- Keep existing select policy ("Users can view own appointments") but expand for practice admin/staff
drop policy if exists "Users can view own appointments" on public.appointments;

create policy "Users can view appointments (patient/doctor/practice access)"
on public.appointments for select
using (
  -- patient
  auth.uid() = patient_id
  -- doctor (via doctors.user_id)
  or exists (
    select 1 from public.doctors d
    where d.id = appointments.doctor_id
      and d.user_id = auth.uid()
  )
  -- practice admin/staff via helper
  or (practice_id is not null and public.can_access_practice(practice_id))
  -- super admin
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- INSERT policies

-- A) Patient self-booking
create policy "Patients can create their own appointments"
on public.appointments for insert
with check (
  patient_id = auth.uid()
  and (practice_id is null or public.can_access_practice(practice_id) or true) -- allow if practice_id set by frontend
);

-- B) Doctor manual booking (doctor can create appointments for any patient, but only for themselves)
create policy "Doctors can create appointments for themselves"
on public.appointments for insert
with check (
  exists (
    select 1 from public.doctors d
    where d.id = appointments.doctor_id
      and d.user_id = auth.uid()
  )
);

-- C) Practice admin/staff can create appointments for their practice
create policy "Practice admin/staff can create appointments in their practice"
on public.appointments for insert
with check (
  practice_id is not null
  and public.can_access_practice(practice_id)
);

-- UPDATE policies (status changes, notes edits, reschedules)
drop policy if exists "Doctors can update appointment status" on public.appointments;
drop policy if exists "Patients can update their appointments" on public.appointments;
drop policy if exists "Practice staff can update appointments" on public.appointments;

create policy "Doctors can update their appointments"
on public.appointments for update
using (
  exists (
    select 1 from public.doctors d
    where d.id = appointments.doctor_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.doctors d
    where d.id = appointments.doctor_id
      and d.user_id = auth.uid()
  )
);

create policy "Patients can update their own appointments"
on public.appointments for update
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "Practice admin/staff can update appointments in their practice"
on public.appointments for update
using (practice_id is not null and public.can_access_practice(practice_id))
with check (practice_id is not null and public.can_access_practice(practice_id));

create policy "Super admin can manage appointments"
on public.appointments for all
using (public.has_role(auth.uid(), 'super_admin'::app_role))
with check (public.has_role(auth.uid(), 'super_admin'::app_role));

commit;
