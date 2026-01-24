begin;

create table if not exists public.medical_record_attachments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,

  -- Storage location (storage.objects.name) inside the 'medical-documents' bucket
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,

  created_at timestamptz not null default now()
);

create index if not exists idx_mra_record_id on public.medical_record_attachments (record_id);
create index if not exists idx_mra_patient_id on public.medical_record_attachments (patient_id);
create index if not exists idx_mra_uploaded_by on public.medical_record_attachments (uploaded_by);

alter table public.medical_record_attachments enable row level security;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

drop policy if exists "Patients can view own medical record attachments" on public.medical_record_attachments;
create policy "Patients can view own medical record attachments"
on public.medical_record_attachments for select
using (
  auth.uid() = patient_id
);

drop policy if exists "Doctors can view attachments of appointment patients" on public.medical_record_attachments;
create policy "Doctors can view attachments of appointment patients"
on public.medical_record_attachments for select
using (
  exists (
    select 1
    from public.appointments a
    join public.doctors d on d.id = a.doctor_id
    where a.patient_id = medical_record_attachments.patient_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "Patients can add attachments to own records" on public.medical_record_attachments;
create policy "Patients can add attachments to own records"
on public.medical_record_attachments for insert
with check (
  auth.uid() = patient_id
  and auth.uid() = uploaded_by
  and exists (
    select 1
    from public.medical_records mr
    where mr.id = medical_record_attachments.record_id
      and mr.patient_id = auth.uid()
  )
);

drop policy if exists "Patients can delete own attachments" on public.medical_record_attachments;
create policy "Patients can delete own attachments"
on public.medical_record_attachments for delete
using (
  auth.uid() = uploaded_by
);

drop policy if exists "Super admins can manage all medical record attachments" on public.medical_record_attachments;
create policy "Super admins can manage all medical record attachments"
on public.medical_record_attachments for all
using (
  public.has_role(auth.uid(), 'super_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin')
);

-- ------------------------------------------------------------
-- Ensure medical_records.added_by is always attributed to the inserting user if omitted.
-- (Fixes cases where clients accidentally send a label like 'patient' instead of a UUID.)
-- ------------------------------------------------------------
create or replace function public.set_medical_record_added_by_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.patient_id is null then
    new.patient_id := auth.uid();
  end if;

  if new.added_by is null then
    new.added_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_medical_record_added_by_defaults on public.medical_records;
create trigger trg_set_medical_record_added_by_defaults
before insert on public.medical_records
for each row
execute function public.set_medical_record_added_by_defaults();

commit;
