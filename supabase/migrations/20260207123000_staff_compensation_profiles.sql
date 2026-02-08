-- File: supabase/migrations/20260207123000_staff_compensation_profiles.sql

/*
  Step 7: Staff compensation profiles (salary + hourly) scoped to entity (clinic/lab/pharmacy/imaging)
  - New Supabase migration (unique timestamp)
  - Idempotent SQL
  - RLS enabled + policies using public.has_entity_access(entity_type, entity_id)

  Notes:
  - This table is the "pay setup" per staff member for an entity.
  - Commissions are handled in a later step (commission rules + accruals).
*/

create extension if not exists pgcrypto;

-- -----------------------------
-- staff_compensation_profiles
-- -----------------------------
create table if not exists public.staff_compensation_profiles (
  id uuid primary key default gen_random_uuid(),

  -- scope
  entity_type text not null, -- 'practice' | 'lab' | 'pharmacy' | 'imaging_center'
  entity_id uuid not null,

  -- staff member
  user_id uuid not null,

  -- compensation definition
  compensation_type text not null, -- 'salary' | 'hourly'

  -- salary fields
  salary_amount_cents bigint,
  salary_period text, -- 'monthly' | 'weekly' | 'daily'

  -- hourly fields
  hourly_rate_cents bigint,

  -- payout frequency (when the staff is paid)
  payout_frequency text not null default 'monthly', -- 'monthly' | 'weekly' | 'daily' | 'each_time'

  -- effective dating
  effective_from date not null default current_date,
  is_active boolean not null default true,

  notes text,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  -- entity type constraint
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_entity_type_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  -- compensation type constraint
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_comp_type_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_comp_type_chk
      check (compensation_type in ('salary','hourly'));
  end if;

  -- salary period constraint
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_salary_period_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_salary_period_chk
      check (salary_period is null or salary_period in ('monthly','weekly','daily'));
  end if;

  -- payout frequency constraint
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_payout_frequency_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_payout_frequency_chk
      check (payout_frequency in ('monthly','weekly','daily','each_time'));
  end if;

  -- ensure amounts are not negative
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_amounts_nonneg_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_amounts_nonneg_chk
      check (
        (salary_amount_cents is null or salary_amount_cents >= 0)
        and (hourly_rate_cents is null or hourly_rate_cents >= 0)
      );
  end if;

  -- ensure required fields exist depending on type
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_comp_profiles_type_fields_chk'
  ) then
    alter table public.staff_compensation_profiles
      add constraint staff_comp_profiles_type_fields_chk
      check (
        (compensation_type = 'salary' and salary_amount_cents is not null and salary_period is not null and hourly_rate_cents is null)
        or
        (compensation_type = 'hourly' and hourly_rate_cents is not null and salary_amount_cents is null and salary_period is null)
      );
  end if;
end $$;

-- Useful indexes
create index if not exists staff_comp_profiles_entity_idx
  on public.staff_compensation_profiles (entity_type, entity_id);

create index if not exists staff_comp_profiles_user_idx
  on public.staff_compensation_profiles (user_id);

create index if not exists staff_comp_profiles_effective_idx
  on public.staff_compensation_profiles (entity_type, entity_id, user_id, effective_from desc);

-- Only one active profile per (entity, user)
create unique index if not exists staff_comp_profiles_one_active_per_user
  on public.staff_compensation_profiles (entity_type, entity_id, user_id)
  where is_active;

-- Trigger to maintain updated_at / updated_by (function created in Step 2 migration)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_staff_comp_profiles_updated'
  ) then
    create trigger tg_staff_comp_profiles_updated
    before update on public.staff_compensation_profiles
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.staff_compensation_profiles enable row level security;

do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_compensation_profiles'
      and policyname = 'staff_comp_profiles_select'
  ) then
    create policy staff_comp_profiles_select
      on public.staff_compensation_profiles
      for select
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_compensation_profiles'
      and policyname = 'staff_comp_profiles_insert'
  ) then
    create policy staff_comp_profiles_insert
      on public.staff_compensation_profiles
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_compensation_profiles'
      and policyname = 'staff_comp_profiles_update'
  ) then
    create policy staff_comp_profiles_update
      on public.staff_compensation_profiles
      for update
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      )
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_compensation_profiles'
      and policyname = 'staff_comp_profiles_delete'
  ) then
    create policy staff_comp_profiles_delete
      on public.staff_compensation_profiles
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;
