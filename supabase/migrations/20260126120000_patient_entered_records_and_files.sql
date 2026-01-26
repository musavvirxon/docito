begin;

-- -----------------------------------------------------------------------------
-- Storage bucket for patient-uploaded files
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

-- Storage RLS policies for bucket 'patient-files'
drop policy if exists "Patient files: upload own" on storage.objects;
create policy "Patient files: upload own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient-files'
  and name like (auth.uid()::text || '/%')
);

drop policy if exists "Patient files: read own" on storage.objects;
create policy "Patient files: read own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-files'
  and name like (auth.uid()::text || '/%')
);

drop policy if exists "Patient files: update own" on storage.objects;
create policy "Patient files: update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'patient-files'
  and name like (auth.uid()::text || '/%')
)
with check (
  bucket_id = 'patient-files'
  and name like (auth.uid()::text || '/%')
);

drop policy if exists "Patient files: delete own" on storage.objects;
create policy "Patient files: delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'patient-files'
  and name like (auth.uid()::text || '/%')
);

-- -----------------------------------------------------------------------------
-- Add attachment fields for medical_records (patient-entered uploads supported)
-- -----------------------------------------------------------------------------
alter table public.medical_records
  add column if not exists attachment_bucket text not null default 'patient-files';

alter table public.medical_records
  add column if not exists attachment_paths text[] not null default '{}'::text[];

-- Ensure added_by defaults to current user (works for both patient and providers)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'medical_records'
      and column_name = 'added_by'
  ) then
    execute 'alter table public.medical_records alter column added_by set default auth.uid()';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Patient-entered medications: add added_by + policies
-- -----------------------------------------------------------------------------
alter table public.medications
  add column if not exists added_by uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'medications'
      and column_name = 'added_by'
  ) then
    execute 'alter table public.medications alter column added_by set default auth.uid()';
  end if;
end $$;

-- Generated marker for "added by patient" (idempotent)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'medications'
      and column_name = 'added_by_patient'
  ) then
    execute 'alter table public.medications add column added_by_patient boolean generated always as (added_by = patient_id) stored';
  end if;
end $$;

-- RLS policies to allow patients to add/manage their own medication entries (no doctor/treatment plan)
drop policy if exists "Patients can add their own medications" on public.medications;
create policy "Patients can add their own medications"
on public.medications
for insert
to authenticated
with check (
  patient_id = auth.uid()
  and doctor_id is null
  and treatment_plan_id is null
);

drop policy if exists "Patients can update their own medications" on public.medications;
create policy "Patients can update their own medications"
on public.medications
for update
to authenticated
using (
  patient_id = auth.uid()
  and doctor_id is null
  and treatment_plan_id is null
)
with check (
  patient_id = auth.uid()
  and doctor_id is null
  and treatment_plan_id is null
);

drop policy if exists "Patients can delete their own medications" on public.medications;
create policy "Patients can delete their own medications"
on public.medications
for delete
to authenticated
using (
  patient_id = auth.uid()
  and doctor_id is null
  and treatment_plan_id is null
);

-- -----------------------------------------------------------------------------
-- Patient-uploaded test results table (lab/imaging/other)
-- -----------------------------------------------------------------------------
create table if not exists public.patient_test_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('lab', 'imaging', 'other')),
  title text not null,
  test_date date not null,
  notes text,
  attachment_bucket text not null default 'patient-files',
  attachment_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_patient_test_results_updated_at'
  ) then
    execute $trg$
      create or replace function public._set_updated_at()
      returns trigger as $$
      begin
        new.updated_at = now();
        return new;
      end;
      $$ language plpgsql;
    $trg$;

    execute $trg2$
      create trigger set_patient_test_results_updated_at
      before update on public.patient_test_results
      for each row execute function public._set_updated_at();
    $trg2$;
  end if;
end $$;

alter table public.patient_test_results enable row level security;

drop policy if exists "Patients can read own patient_test_results" on public.patient_test_results;
create policy "Patients can read own patient_test_results"
on public.patient_test_results
for select
to authenticated
using (patient_id = auth.uid());

drop policy if exists "Patients can insert own patient_test_results" on public.patient_test_results;
create policy "Patients can insert own patient_test_results"
on public.patient_test_results
for insert
to authenticated
with check (patient_id = auth.uid());

drop policy if exists "Patients can update own patient_test_results" on public.patient_test_results;
create policy "Patients can update own patient_test_results"
on public.patient_test_results
for update
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

drop policy if exists "Patients can delete own patient_test_results" on public.patient_test_results;
create policy "Patients can delete own patient_test_results"
on public.patient_test_results
for delete
to authenticated
using (patient_id = auth.uid());

commit;
