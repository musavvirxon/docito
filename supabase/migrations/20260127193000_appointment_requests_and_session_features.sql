-- File: supabase/migrations/20260127193000_appointment_requests_and_session_features.sql
-- NEW MIGRATION: appointment requests (patient confirmation flow), appointment-linked clinical data,
-- and doctor notifications when patient requests appointment start.
--
-- This migration is idempotent.

-- 0) Extensions
create extension if not exists "pgcrypto";

-- 1) Appointment requests (hold slot until patient confirms)
create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid not null,
  practice_id uuid null,
  procedure_id uuid null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  appointment_type text not null default 'in_person',
  notes text null,
  status text not null default 'pending',
  appointment_id uuid null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign keys (added separately to stay idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_patient_id_fkey'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_patient_id_fkey
      foreign key (patient_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_doctor_id_fkey'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_doctor_id_fkey
      foreign key (doctor_id) references public.doctors(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_practice_id_fkey'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_practice_id_fkey
      foreign key (practice_id) references public.practices(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_procedure_id_fkey'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_procedure_id_fkey
      foreign key (procedure_id) references public.procedures(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_appointment_id_fkey'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_appointment_id_fkey
      foreign key (appointment_id) references public.appointments(id) on delete set null;
  end if;
end $$;

-- Basic constraints
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_status_check'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_status_check
      check (status in ('pending','confirmed','expired','canceled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointment_requests_type_check'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_type_check
      check (appointment_type in ('in_person','video','home_visit','messaging','follow_up'));
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_appointment_requests_patient_id on public.appointment_requests(patient_id);
create index if not exists idx_appointment_requests_doctor_date on public.appointment_requests(doctor_id, appointment_date);
create index if not exists idx_appointment_requests_status on public.appointment_requests(status);

-- Prevent multiple pending holds for the exact same slot per doctor (best-effort, expiration is enforced in app logic)
create unique index if not exists uniq_appointment_requests_pending_slot
  on public.appointment_requests(doctor_id, appointment_date, start_time, end_time)
  where status = 'pending';

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_appointment_requests_set_updated_at on public.appointment_requests;
create trigger tr_appointment_requests_set_updated_at
before update on public.appointment_requests
for each row
execute function public.set_updated_at();

-- RLS (patients must be able to read their request to confirm)
alter table public.appointment_requests enable row level security;

drop policy if exists "appointment_requests_select_own" on public.appointment_requests;
create policy "appointment_requests_select_own"
on public.appointment_requests
for select
using (auth.uid() = patient_id);

-- 2) Appointment-linked clinical data (doctor-created during appointment)
alter table public.medications
  add column if not exists appointment_id uuid null;

alter table public.treatment_plans
  add column if not exists appointment_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'medications_appointment_id_fkey') then
    alter table public.medications
      add constraint medications_appointment_id_fkey
      foreign key (appointment_id) references public.appointments(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'treatment_plans_appointment_id_fkey') then
    alter table public.treatment_plans
      add constraint treatment_plans_appointment_id_fkey
      foreign key (appointment_id) references public.appointments(id) on delete set null;
  end if;
end $$;

create index if not exists idx_medications_appointment_id on public.medications(appointment_id);
create index if not exists idx_treatment_plans_appointment_id on public.treatment_plans(appointment_id);

-- 3) Notify doctor when patient requests start of appointment
--    PatientDashboard sets appointments.start_requested_by_patient = true.
create or replace function public.notify_doctor_on_patient_start_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_user_id uuid;
  v_patient_name text;
begin
  if (tg_op <> 'UPDATE') then
    return new;
  end if;

  -- Fire only when toggled to true
  if (coalesce(old.start_requested_by_patient,false) = false and coalesce(new.start_requested_by_patient,false) = true) then
    select d.user_id into v_doctor_user_id
    from public.doctors d
    where d.id = new.doctor_id;

    select p.full_name into v_patient_name
    from public.profiles p
    where p.user_id = new.patient_id;

    if v_doctor_user_id is not null then
      insert into public.real_time_notifications (
        recipient_user_id,
        sender_user_id,
        notification_type,
        title,
        message,
        data
      ) values (
        v_doctor_user_id,
        new.patient_id,
        'appointment_start_request',
        'Patient is ready to start',
        coalesce(v_patient_name,'A patient') || ' requested to start the appointment.',
        jsonb_build_object(
          'appointment_id', new.id,
          'doctor_id', new.doctor_id,
          'patient_id', new.patient_id,
          'appointment_date', new.appointment_date,
          'start_time', new.start_time,
          'end_time', new.end_time
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_notify_doctor_on_patient_start_request on public.appointments;
create trigger tr_notify_doctor_on_patient_start_request
after update of start_requested_by_patient on public.appointments
for each row
execute function public.notify_doctor_on_patient_start_request();
