begin;

-- ======================================
-- 1) Appointments: performance indexes
-- ======================================
-- These are safe and won't change behavior.
do $$
begin
  -- doctor/date lookup
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='doctor_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='appointment_date'
  ) then
    execute 'create index if not exists idx_appointments_doctor_date on public.appointments (doctor_id, appointment_date)';
  end if;

  -- patient lookup
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='patient_id'
  ) then
    execute 'create index if not exists idx_appointments_patient on public.appointments (patient_id)';
  end if;

  -- status lookup
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='status'
  ) then
    execute 'create index if not exists idx_appointments_status on public.appointments (status)';
  end if;
end $$;

-- ======================================
-- 2) Prevent double booking (unique key)
-- ======================================
-- Common pattern: doctor_id + appointment_date + start_time
-- If your app uses a timestamp column (start_at), we'll do a second option below.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='doctor_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='appointment_date'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='start_time'
  ) then
    -- Avoid duplicates even if status differs.
    -- If you allow multiple statuses at same time (should not), change this to a partial unique.
    execute '
      alter table public.appointments
      add constraint appointments_unique_doctor_date_start
      unique (doctor_id, appointment_date, start_time)
    ';
  end if;
exception
  when duplicate_object then
    -- constraint already exists
    null;
end $$;

-- Alternative if your schema uses start_at timestamp
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='doctor_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='start_at'
  ) then
    execute '
      alter table public.appointments
      add constraint appointments_unique_doctor_startat
      unique (doctor_id, start_at)
    ';
  end if;
exception
  when duplicate_object then
    null;
end $$;

-- ======================================
-- 3) Referral slots booking support indexes
-- ======================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='referral_slots') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referral_slots' and column_name='referral_id') then
      execute 'create index if not exists idx_referral_slots_referral_id on public.referral_slots (referral_id)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referral_slots' and column_name='start_time') then
      execute 'create index if not exists idx_referral_slots_start_time on public.referral_slots (start_time)';
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='referral_slots' and column_name='is_booked') then
      execute 'create index if not exists idx_referral_slots_is_booked on public.referral_slots (is_booked)';
    end if;
  end if;
end $$;

commit;
