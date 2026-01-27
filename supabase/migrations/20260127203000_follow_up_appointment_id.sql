-- File: supabase/migrations/20260127203000_follow_up_appointment_id.sql
-- Idempotent migration to support follow-up appointments.

-- 1) Add follow_up_of_appointment_id column
alter table public.appointments
  add column if not exists follow_up_of_appointment_id uuid;

-- 2) Foreign key to appointments(id)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_follow_up_of_appointment_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_follow_up_of_appointment_id_fkey
      foreign key (follow_up_of_appointment_id)
      references public.appointments(id)
      on delete set null;
  end if;
end $$;

-- 3) Indexes for faster lookups
create index if not exists appointments_follow_up_of_appointment_id_idx
  on public.appointments (follow_up_of_appointment_id);

create index if not exists appointments_follow_up_doctor_date_idx
  on public.appointments (doctor_id, appointment_date, follow_up_of_appointment_id);
