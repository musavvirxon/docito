-- File: supabase/migrations/20260128120000_doctor_templates_and_followups.sql
-- Purpose:
-- 1) Doctor-owned custom procedures and treatment plan templates (for appointment clinical items/templates)
-- 2) Appointment clinical templates (multi-item presets)
-- 3) Follow-up appointment linkage fields + indexes
-- Idempotent: safe to run multiple times.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Doctor Procedures
-- ---------------------------------------------------------------------------
create table if not exists public.doctor_procedures (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid null,
  doctor_user_id uuid null,
  name text not null,
  description text null,
  duration_minutes integer null,
  price_cents integer null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_procedures_owner_chk
    check (doctor_id is not null or doctor_user_id is not null)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_doctor_procedures_set_updated_at'
  ) then
    create trigger trg_doctor_procedures_set_updated_at
    before update on public.doctor_procedures
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_doctor_procedures_doctor_id_name
  on public.doctor_procedures (doctor_id, name);

create index if not exists idx_doctor_procedures_doctor_user_id_name
  on public.doctor_procedures (doctor_user_id, name);

-- RLS
alter table public.doctor_procedures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='doctor_procedures'
      and policyname='doctor_procedures_select_own'
  ) then
    create policy doctor_procedures_select_own
      on public.doctor_procedures
      for select
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = doctor_procedures.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='doctor_procedures'
      and policyname='doctor_procedures_insert_own'
  ) then
    create policy doctor_procedures_insert_own
      on public.doctor_procedures
      for insert
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = doctor_procedures.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='doctor_procedures'
      and policyname='doctor_procedures_update_own'
  ) then
    create policy doctor_procedures_update_own
      on public.doctor_procedures
      for update
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = doctor_procedures.doctor_id
              and d.user_id = auth.uid()
          )
        )
      )
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = doctor_procedures.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='doctor_procedures'
      and policyname='doctor_procedures_delete_own'
  ) then
    create policy doctor_procedures_delete_own
      on public.doctor_procedures
      for delete
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = doctor_procedures.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Treatment Plan Templates
-- ---------------------------------------------------------------------------
create table if not exists public.treatment_plan_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid null,
  doctor_user_id uuid null,
  title text not null,
  description text null,
  plan_json jsonb null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treatment_plan_templates_owner_chk
    check (doctor_id is not null or doctor_user_id is not null)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_treatment_plan_templates_set_updated_at'
  ) then
    create trigger trg_treatment_plan_templates_set_updated_at
    before update on public.treatment_plan_templates
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_treatment_plan_templates_doctor_id_updated_at
  on public.treatment_plan_templates (doctor_id, updated_at desc);

create index if not exists idx_treatment_plan_templates_doctor_user_id_updated_at
  on public.treatment_plan_templates (doctor_user_id, updated_at desc);

-- RLS
alter table public.treatment_plan_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='treatment_plan_templates'
      and policyname='treatment_plan_templates_select_own'
  ) then
    create policy treatment_plan_templates_select_own
      on public.treatment_plan_templates
      for select
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = treatment_plan_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='treatment_plan_templates'
      and policyname='treatment_plan_templates_insert_own'
  ) then
    create policy treatment_plan_templates_insert_own
      on public.treatment_plan_templates
      for insert
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = treatment_plan_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='treatment_plan_templates'
      and policyname='treatment_plan_templates_update_own'
  ) then
    create policy treatment_plan_templates_update_own
      on public.treatment_plan_templates
      for update
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = treatment_plan_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      )
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = treatment_plan_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='treatment_plan_templates'
      and policyname='treatment_plan_templates_delete_own'
  ) then
    create policy treatment_plan_templates_delete_own
      on public.treatment_plan_templates
      for delete
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = treatment_plan_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Appointment Clinical Templates (multi-item presets)
-- ---------------------------------------------------------------------------
create table if not exists public.appointment_clinical_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid null,
  doctor_user_id uuid null,
  name text not null,
  description text null,
  items_json jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_clinical_templates_owner_chk
    check (doctor_id is not null or doctor_user_id is not null)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_appointment_clinical_templates_set_updated_at'
  ) then
    create trigger trg_appointment_clinical_templates_set_updated_at
    before update on public.appointment_clinical_templates
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_appointment_clinical_templates_doctor_id_updated_at
  on public.appointment_clinical_templates (doctor_id, updated_at desc);

create index if not exists idx_appointment_clinical_templates_doctor_user_id_updated_at
  on public.appointment_clinical_templates (doctor_user_id, updated_at desc);

-- RLS
alter table public.appointment_clinical_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_clinical_templates'
      and policyname='appointment_clinical_templates_select_own'
  ) then
    create policy appointment_clinical_templates_select_own
      on public.appointment_clinical_templates
      for select
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = appointment_clinical_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_clinical_templates'
      and policyname='appointment_clinical_templates_insert_own'
  ) then
    create policy appointment_clinical_templates_insert_own
      on public.appointment_clinical_templates
      for insert
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = appointment_clinical_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_clinical_templates'
      and policyname='appointment_clinical_templates_update_own'
  ) then
    create policy appointment_clinical_templates_update_own
      on public.appointment_clinical_templates
      for update
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = appointment_clinical_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      )
      with check (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = appointment_clinical_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='appointment_clinical_templates'
      and policyname='appointment_clinical_templates_delete_own'
  ) then
    create policy appointment_clinical_templates_delete_own
      on public.appointment_clinical_templates
      for delete
      using (
        doctor_user_id = auth.uid()
        or (
          doctor_id is not null
          and exists (
            select 1 from public.doctors d
            where d.id = appointment_clinical_templates.doctor_id
              and d.user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Appointment clinical items: add audit columns if missing + index
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'appointment_clinical_items'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='appointment_clinical_items'
        and column_name='created_by'
    ) then
      alter table public.appointment_clinical_items
        add column created_by uuid null;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='appointment_clinical_items'
        and column_name='updated_by'
    ) then
      alter table public.appointment_clinical_items
        add column updated_by uuid null;
    end if;
  end if;
end $$;

create index if not exists idx_appointment_clinical_items_appointment_id_created_at
  on public.appointment_clinical_items (appointment_id, created_at);

-- ---------------------------------------------------------------------------
-- Follow-up appointments (best-effort; only add if missing)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'appointments'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='appointments'
        and column_name='appointment_type'
    ) then
      alter table public.appointments
        add column appointment_type text null;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='appointments'
        and column_name='follow_up_of_appointment_id'
    ) then
      alter table public.appointments
        add column follow_up_of_appointment_id uuid null;
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'appointments_follow_up_of_fkey'
    ) then
      begin
        alter table public.appointments
          add constraint appointments_follow_up_of_fkey
          foreign key (follow_up_of_appointment_id)
          references public.appointments(id)
          on delete set null;
      exception when others then
        -- ignore if table/column types differ or constraint exists under another name
      end;
    end if;
  end if;
end $$;

create index if not exists idx_appointments_follow_up_of
  on public.appointments (follow_up_of_appointment_id);

commit;
