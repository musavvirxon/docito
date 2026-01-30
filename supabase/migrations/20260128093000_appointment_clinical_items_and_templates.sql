-- Path: supabase/migrations/20260128093000_appointment_clinical_items_and_templates.sql
begin;

-- updated_at helper (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Doctor templates library
-- =========================
create table if not exists public.doctor_clinical_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('procedure', 'medication', 'treatment_plan')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_clinical_templates_doctor_id_idx
  on public.doctor_clinical_templates (doctor_id);

create index if not exists doctor_clinical_templates_item_type_idx
  on public.doctor_clinical_templates (doctor_id, item_type);

create index if not exists doctor_clinical_templates_details_gin
  on public.doctor_clinical_templates using gin (details);

alter table public.doctor_clinical_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctor_clinical_templates'
      and policyname = 'doctor_templates_select_own'
  ) then
    create policy doctor_templates_select_own
      on public.doctor_clinical_templates
      for select
      using (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctor_clinical_templates'
      and policyname = 'doctor_templates_insert_own'
  ) then
    create policy doctor_templates_insert_own
      on public.doctor_clinical_templates
      for insert
      with check (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctor_clinical_templates'
      and policyname = 'doctor_templates_update_own'
  ) then
    create policy doctor_templates_update_own
      on public.doctor_clinical_templates
      for update
      using (doctor_id = auth.uid())
      with check (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctor_clinical_templates'
      and policyname = 'doctor_templates_delete_own'
  ) then
    create policy doctor_templates_delete_own
      on public.doctor_clinical_templates
      for delete
      using (doctor_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_doctor_clinical_templates_updated_at'
  ) then
    create trigger trg_doctor_clinical_templates_updated_at
      before update on public.doctor_clinical_templates
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- =========================
-- Appointment clinical items
-- =========================
create table if not exists public.appointment_clinical_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid null references auth.users(id) on delete set null,
  doctor_patient_id uuid null,
  item_type text not null check (item_type in ('procedure', 'medication', 'treatment_plan')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_clinical_items_appointment_idx
  on public.appointment_clinical_items (appointment_id);

create index if not exists appointment_clinical_items_doctor_idx
  on public.appointment_clinical_items (doctor_id, appointment_id);

create index if not exists appointment_clinical_items_item_type_idx
  on public.appointment_clinical_items (doctor_id, item_type);

create index if not exists appointment_clinical_items_details_gin
  on public.appointment_clinical_items using gin (details);

alter table public.appointment_clinical_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointment_clinical_items'
      and policyname = 'appointment_clinical_items_select_own'
  ) then
    create policy appointment_clinical_items_select_own
      on public.appointment_clinical_items
      for select
      using (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointment_clinical_items'
      and policyname = 'appointment_clinical_items_insert_own'
  ) then
    create policy appointment_clinical_items_insert_own
      on public.appointment_clinical_items
      for insert
      with check (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointment_clinical_items'
      and policyname = 'appointment_clinical_items_update_own'
  ) then
    create policy appointment_clinical_items_update_own
      on public.appointment_clinical_items
      for update
      using (doctor_id = auth.uid())
      with check (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointment_clinical_items'
      and policyname = 'appointment_clinical_items_delete_own'
  ) then
    create policy appointment_clinical_items_delete_own
      on public.appointment_clinical_items
      for delete
      using (doctor_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_appointment_clinical_items_updated_at'
  ) then
    create trigger trg_appointment_clinical_items_updated_at
      before update on public.appointment_clinical_items
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

commit;
