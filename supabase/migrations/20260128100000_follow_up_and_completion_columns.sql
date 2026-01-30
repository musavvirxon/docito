-- Path: supabase/migrations/20260128100000_follow_up_and_completion_columns.sql
begin;

-- Ensure follow-up linkage column exists
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'follow_up_of_appointment_id'
  ) then
    alter table public.appointments
      add column follow_up_of_appointment_id uuid;
  end if;
end $$;

-- Ensure FK exists (idempotent)
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

-- Ensure appointment_type column exists (do NOT add restrictive CHECK to avoid breaking existing values)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'appointment_type'
  ) then
    alter table public.appointments
      add column appointment_type text not null default 'in_person';
  end if;
end $$;

-- Ensure completed_at column exists
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'completed_at'
  ) then
    alter table public.appointments
      add column completed_at timestamptz null;
  end if;
end $$;

-- Helpful index for follow-up queries
create index if not exists appointments_follow_up_of_appointment_id_idx
  on public.appointments (follow_up_of_appointment_id);

commit;
