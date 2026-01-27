-- File: supabase/migrations/20260127201000_followups_and_clinical_item_templates.sql

-- 1) Follow-up appointments: appointments.follow_up_of_appointment_id (+ FK + index)
alter table public.appointments
  add column if not exists follow_up_of_appointment_id uuid;

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

create index if not exists appointments_follow_up_of_appointment_id_idx
  on public.appointments (follow_up_of_appointment_id);

-- 2) Extra helpful indexes for appointment_clinical_items
create index if not exists appointment_clinical_items_patient_id_idx
  on public.appointment_clinical_items (patient_id);

create index if not exists appointment_clinical_items_doctor_patient_id_idx
  on public.appointment_clinical_items (doctor_patient_id);

-- 3) Doctor reusable templates for clinical items
create table if not exists public.clinical_item_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
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
    where conname = 'clinical_item_templates_type_chk'
  ) then
    alter table public.clinical_item_templates
      add constraint clinical_item_templates_type_chk
      check (item_type in ('procedure','medication','treatment_plan'));
  end if;
end $$;

create index if not exists clinical_item_templates_doctor_idx
  on public.clinical_item_templates (doctor_id, created_at desc);

alter table public.clinical_item_templates enable row level security;

-- RLS policies: doctor owns templates
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clinical_item_templates' and policyname='clinical_item_templates_select_doctor_owner'
  ) then
    create policy clinical_item_templates_select_doctor_owner
      on public.clinical_item_templates
      for select
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clinical_item_templates' and policyname='clinical_item_templates_insert_doctor_owner'
  ) then
    create policy clinical_item_templates_insert_doctor_owner
      on public.clinical_item_templates
      for insert
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clinical_item_templates' and policyname='clinical_item_templates_update_doctor_owner'
  ) then
    create policy clinical_item_templates_update_doctor_owner
      on public.clinical_item_templates
      for update
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clinical_item_templates' and policyname='clinical_item_templates_delete_doctor_owner'
  ) then
    create policy clinical_item_templates_delete_doctor_owner
      on public.clinical_item_templates
      for delete
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- updated_at trigger (reuses public.touch_updated_at if present, creates it if missing)
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
    where tgname = 'trg_clinical_item_templates_touch_updated_at'
  ) then
    create trigger trg_clinical_item_templates_touch_updated_at
      before update on public.clinical_item_templates
      for each row
      execute function public.touch_updated_at();
  end if;
end $$;
