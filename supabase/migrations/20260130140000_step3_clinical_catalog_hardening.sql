-- Path: supabase/migrations/20260130140000_step3_clinical_catalog_hardening.sql
-- FILE: supabase/migrations/20260130140000_step3_clinical_catalog_hardening.sql
-- Idempotent migration to ensure Step 3 clinical catalog + appointment clinical items support is complete.

-- Ensure shared updated_at trigger function exists (safe to replace).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1) Ensure appointment clinical item templates exist + secured
-- -----------------------------------------------------------------------------
create table if not exists public.appointment_clinical_item_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  type text not null,
  name text not null,
  description text null,
  default_cost numeric null,
  is_active boolean not null default true
);

-- Ensure type check constraint exists (supports procedure/medication/treatment_plan)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_clinical_item_templates_type_chk'
  ) then
    alter table public.appointment_clinical_item_templates
      add constraint appointment_clinical_item_templates_type_chk
      check (type in ('procedure','medication','treatment_plan'));
  end if;
end $$;

alter table public.appointment_clinical_item_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_appointment_clinical_item_templates_updated_at'
  ) then
    create trigger trg_appointment_clinical_item_templates_updated_at
    before update on public.appointment_clinical_item_templates
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists appointment_clinical_item_templates_doctor_idx
on public.appointment_clinical_item_templates (doctor_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_clinical_item_templates'
      and policyname='templates_doctor_rw'
  ) then
    create policy templates_doctor_rw
      on public.appointment_clinical_item_templates
      for all
      using (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.doctors d
          where d.id = appointment_clinical_item_templates.doctor_id
            and d.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Ensure appointment clinical items support templates link + stable constraints
-- -----------------------------------------------------------------------------
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

-- Ensure XOR constraint exists (patient_id xor doctor_patient_id)
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

-- Ensure type constraint exists
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

alter table public.appointment_clinical_items
  add column if not exists template_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_clinical_items_template_id_fkey'
  ) then
    alter table public.appointment_clinical_items
      add constraint appointment_clinical_items_template_id_fkey
      foreign key (template_id)
      references public.appointment_clinical_item_templates(id)
      on delete set null;
  end if;
end $$;

create index if not exists appointment_clinical_items_appointment_idx
  on public.appointment_clinical_items (appointment_id, created_at desc);

create index if not exists appointment_clinical_items_doctor_idx
  on public.appointment_clinical_items (doctor_id);

create index if not exists appointment_clinical_items_template_idx
  on public.appointment_clinical_items (template_id);

alter table public.appointment_clinical_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_appointment_clinical_items_updated_at'
  ) then
    create trigger trg_appointment_clinical_items_updated_at
    before update on public.appointment_clinical_items
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Ensure core RLS policies exist (doctor + patient parties)
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

-- -----------------------------------------------------------------------------
-- 3) Harden doctor-owned catalogs: procedures + treatment_plans ownership consistency
--    (ensures doctors can access their own custom procedures and treatment plans)
-- -----------------------------------------------------------------------------

-- Procedures: ensure commonly-used columns exist and dentist_id is stored as doctors.id (not auth uid).
do $$
begin
  if to_regclass('public.procedures') is not null then
    -- Columns used by UI/catalog
    alter table public.procedures add column if not exists active boolean;
    alter table public.procedures alter column active set default true;
    update public.procedures set active = true where active is null;

    alter table public.procedures add column if not exists estimated_duration_minutes integer;
    alter table public.procedures alter column estimated_duration_minutes set default 30;
    update public.procedures set estimated_duration_minutes = 30 where estimated_duration_minutes is null;

    alter table public.procedures add column if not exists price numeric(10,2);

    -- Fix common drift: procedures.dentist_id accidentally stored doctors.user_id (auth uid)
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='procedures' and column_name='dentist_id'
    ) then
      update public.procedures p
      set dentist_id = d.id
      from public.doctors d
      where p.dentist_id = d.user_id;
    end if;

    -- Helpful owner index (use whichever owner column exists)
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='procedures' and column_name='dentist_id'
    ) then
      execute 'create index if not exists idx_procedures_owner_id on public.procedures(dentist_id)';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema=''public'' and table_name=''procedures'' and column_name=''doctor_id''
    ) then
      execute 'create index if not exists idx_procedures_owner_id on public.procedures(doctor_id)';
    end if;
  end if;
end $$;

-- Treatment plans: ensure owner is doctors.id when possible and add indexes for fast lookup.
do $$
begin
  if to_regclass('public.treatment_plans') is not null then
    -- Fix common drift: treatment_plans.doctor_id accidentally stored doctors.user_id (auth uid)
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='doctor_id'
    ) then
      update public.treatment_plans tp
      set doctor_id = d.id
      from public.doctors d
      where tp.doctor_id = d.user_id;
    end if;

    -- Helpful indexes for doctor access during appointment
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='doctor_id'
    ) then
      execute 'create index if not exists idx_treatment_plans_owner_id on public.treatment_plans(doctor_id)';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='dentist_id'
    ) then
      execute 'create index if not exists idx_treatment_plans_owner_id on public.treatment_plans(dentist_id)';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='patient_id'
    ) then
      execute 'create index if not exists idx_treatment_plans_patient_id_fast on public.treatment_plans(patient_id)';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='doctor_patient_id'
    ) then
      execute 'create index if not exists idx_treatment_plans_doctor_patient_id_fast on public.treatment_plans(doctor_patient_id) where doctor_patient_id is not null';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='treatment_plans' and column_name='appointment_id'
    ) then
      execute 'create index if not exists idx_treatment_plans_appointment_id_fast on public.treatment_plans(appointment_id)';
    end if;
  end if;
end $$;
