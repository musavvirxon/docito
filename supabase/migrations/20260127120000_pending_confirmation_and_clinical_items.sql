-- File: supabase/migrations/20260127120000_pending_confirmation_and_clinical_items.sql

-- 1) Pending booking holds (patient must confirm before appointment is created)
create table if not exists public.appointment_holds (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid null references auth.users(id) on delete set null,
  doctor_patient_id uuid null references public.doctor_patients(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  practice_id uuid null references public.practices(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  appointment_type text not null default 'in_person',
  notes text null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointment_holds_patient_xor_doctor_patient_chk'
  ) then
    alter table public.appointment_holds
      add constraint appointment_holds_patient_xor_doctor_patient_chk
      check (
        (patient_id is not null and doctor_patient_id is null)
        or
        (patient_id is null and doctor_patient_id is not null)
      );
  end if;
end $$;

create index if not exists appointment_holds_doctor_start_at_idx
  on public.appointment_holds (doctor_id, start_at);

create index if not exists appointment_holds_expires_at_idx
  on public.appointment_holds (expires_at);

create index if not exists appointment_holds_patient_id_idx
  on public.appointment_holds (patient_id);

create index if not exists appointment_holds_doctor_patient_id_idx
  on public.appointment_holds (doctor_patient_id);

create or replace function public.cleanup_expired_appointment_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.appointment_holds
  where status = 'pending'
    and expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.appointment_holds enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_holds' and policyname='appointment_holds_select_owner_or_doctor'
  ) then
    create policy appointment_holds_select_owner_or_doctor
      on public.appointment_holds
      for select
      using (
        (patient_id is not null and patient_id = auth.uid())
        or
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_holds.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_holds' and policyname='appointment_holds_insert_patient_self'
  ) then
    create policy appointment_holds_insert_patient_self
      on public.appointment_holds
      for insert
      with check (
        patient_id is not null
        and patient_id = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_holds' and policyname='appointment_holds_delete_owner'
  ) then
    create policy appointment_holds_delete_owner
      on public.appointment_holds
      for delete
      using (
        patient_id is not null
        and patient_id = auth.uid()
      );
  end if;
end $$;

-- 2) Clinical items authored during an appointment (custom procedures / medications / treatment plans)
create table if not exists public.appointment_clinical_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid null references auth.users(id) on delete set null,
  doctor_patient_id uuid null references public.doctor_patients(id) on delete set null,
  item_type text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointment_clinical_items_patient_xor_doctor_patient_chk'
  ) then
    alter table public.appointment_clinical_items
      add constraint appointment_clinical_items_patient_xor_doctor_patient_chk
      check (
        (patient_id is not null and doctor_patient_id is null)
        or
        (patient_id is null and doctor_patient_id is not null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointment_clinical_items_type_chk'
  ) then
    alter table public.appointment_clinical_items
      add constraint appointment_clinical_items_type_chk
      check (item_type in ('procedure','medication','treatment_plan'));
  end if;
end $$;

create index if not exists appointment_clinical_items_appointment_idx
  on public.appointment_clinical_items (appointment_id, created_at desc);

create index if not exists appointment_clinical_items_doctor_idx
  on public.appointment_clinical_items (doctor_id);

alter table public.appointment_clinical_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_clinical_items' and policyname='appointment_clinical_items_select_parties'
  ) then
    create policy appointment_clinical_items_select_parties
      on public.appointment_clinical_items
      for select
      using (
        (patient_id is not null and patient_id = auth.uid())
        or
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_clinical_items' and policyname='appointment_clinical_items_insert_doctor'
  ) then
    create policy appointment_clinical_items_insert_doctor
      on public.appointment_clinical_items
      for insert
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_clinical_items' and policyname='appointment_clinical_items_update_doctor'
  ) then
    create policy appointment_clinical_items_update_doctor
      on public.appointment_clinical_items
      for update
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointment_clinical_items' and policyname='appointment_clinical_items_delete_doctor'
  ) then
    create policy appointment_clinical_items_delete_doctor
      on public.appointment_clinical_items
      for delete
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_items.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_appointment_clinical_items_touch_updated_at'
  ) then
    create trigger trg_appointment_clinical_items_touch_updated_at
      before update on public.appointment_clinical_items
      for each row
      execute function public.touch_updated_at();
  end if;
end $$;
