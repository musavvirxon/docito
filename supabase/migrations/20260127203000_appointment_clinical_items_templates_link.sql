-- FILE: supabase/migrations/20260127203000_appointment_clinical_items_templates_link.sql
-- Idempotent migration.

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
-- 1) Templates table (ensure it exists + secured)
-- -----------------------------------------------------------------------------
create table if not exists public.appointment_clinical_item_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  type text not null check (type in ('procedure','medication','treatment_plan')),
  name text not null,
  description text null,
  default_cost numeric null,
  is_active boolean not null default true
);

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
-- 2) Link items -> templates (works with both legacy and newer schemas)
-- -----------------------------------------------------------------------------
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

create index if not exists appointment_clinical_items_template_idx
on public.appointment_clinical_items (template_id);
