-- File: supabase/migrations/20260207150000_finance_entity_type_normalization.sql

/*
  Step 17: Normalize finance entity_type values to match core system
  - Core access helper public.has_entity_access expects: clinic | lab | imaging | pharmacy
  - Some modules may send: practice, imaging_center, laboratory
  This migration:
  - Adds a normalizer function
  - Updates existing rows in finance/payroll related tables (if they exist)
  - Updates entity_type CHECK constraints (if they exist by known names)
  All actions are idempotent.
*/

create or replace function public.normalize_finance_entity_type(p_entity_type text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_entity_type, ''))
    when 'practice' then 'clinic'
    when 'clinic' then 'clinic'
    when 'lab' then 'lab'
    when 'laboratory' then 'lab'
    when 'imaging' then 'imaging'
    when 'imaging_center' then 'imaging'
    when 'pharmacy' then 'pharmacy'
    else lower(coalesce(p_entity_type, ''))
  end
$$;

do $$
declare
  t record;
  col_exists boolean;
begin
  for t in
    select unnest(array[
      'finance_categories',
      'finance_entries',
      'staff_compensation_profiles',
      'payroll_runs',
      'finance_budgets',
      'commission_payout_marks'
    ]) as table_name
  loop
    if to_regclass('public.' || t.table_name) is null then
      continue;
    end if;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = t.table_name
        and c.column_name = 'entity_type'
    ) into col_exists;

    if col_exists then
      execute format(
        $sql$
        update public.%I
        set entity_type = public.normalize_finance_entity_type(entity_type)
        where entity_type is not null
          and public.normalize_finance_entity_type(entity_type) <> lower(entity_type)
        $sql$,
        t.table_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  -- finance_categories
  if to_regclass('public.finance_categories') is not null then
    if exists (select 1 from pg_constraint where conname = 'finance_categories_entity_type_chk') then
      alter table public.finance_categories drop constraint finance_categories_entity_type_chk;
    end if;
    alter table public.finance_categories
      add constraint finance_categories_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;

  -- finance_entries
  if to_regclass('public.finance_entries') is not null then
    if exists (select 1 from pg_constraint where conname = 'finance_entries_entity_type_chk') then
      alter table public.finance_entries drop constraint finance_entries_entity_type_chk;
    end if;
    alter table public.finance_entries
      add constraint finance_entries_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;

  -- staff_compensation_profiles
  if to_regclass('public.staff_compensation_profiles') is not null then
    if exists (select 1 from pg_constraint where conname = 'staff_compensation_profiles_entity_type_chk') then
      alter table public.staff_compensation_profiles drop constraint staff_compensation_profiles_entity_type_chk;
    end if;
    alter table public.staff_compensation_profiles
      add constraint staff_compensation_profiles_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;

  -- payroll_runs
  if to_regclass('public.payroll_runs') is not null then
    if exists (select 1 from pg_constraint where conname = 'payroll_runs_entity_type_chk') then
      alter table public.payroll_runs drop constraint payroll_runs_entity_type_chk;
    end if;
    alter table public.payroll_runs
      add constraint payroll_runs_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;

  -- finance_budgets
  if to_regclass('public.finance_budgets') is not null then
    if exists (select 1 from pg_constraint where conname = 'finance_budgets_entity_type_chk') then
      alter table public.finance_budgets drop constraint finance_budgets_entity_type_chk;
    end if;
    alter table public.finance_budgets
      add constraint finance_budgets_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;

  -- commission_payout_marks (if present)
  if to_regclass('public.commission_payout_marks') is not null then
    if exists (select 1 from pg_constraint where conname = 'commission_payout_marks_entity_type_chk') then
      alter table public.commission_payout_marks drop constraint commission_payout_marks_entity_type_chk;
    end if;
    alter table public.commission_payout_marks
      add constraint commission_payout_marks_entity_type_chk
      check (entity_type in ('clinic','lab','imaging','pharmacy'));
  end if;
end $$;
