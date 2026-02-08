-- File: supabase/migrations/20260207134500_finance_budgets.sql

/*
  Step 15: Budgets (monthly) + budget vs actual summary support

  Adds:
  - finance_budgets: per-entity, per-month, per-category budget amount
  - RLS policies using public.has_entity_access(entity_type, entity_id)

  Notes:
  - month_start is a DATE and should be the first day of the month (enforced by CHECK).
  - Budgets are for expense/payroll categories (not enforced at DB level; enforced by UI + summary function).
*/

create extension if not exists pgcrypto;

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'practice' | 'lab' | 'pharmacy' | 'imaging_center'
  entity_id uuid not null,

  month_start date not null, -- first day of month

  category_id uuid not null references public.finance_categories(id) on delete cascade,

  amount_cents bigint not null default 0,
  currency text not null default 'USD',

  notes text,

  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_budgets_entity_type_chk'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_budgets_amount_nonneg_chk'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_amount_nonneg_chk
      check (amount_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_budgets_month_start_first_day_chk'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_month_start_first_day_chk
      check (extract(day from month_start) = 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_budgets_unique_month_category'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_unique_month_category
      unique (entity_type, entity_id, month_start, category_id);
  end if;
end $$;

create index if not exists finance_budgets_entity_month_idx
  on public.finance_budgets (entity_type, entity_id, month_start desc);

create index if not exists finance_budgets_category_idx
  on public.finance_budgets (category_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_finance_budgets_updated'
  ) then
    create trigger tg_finance_budgets_updated
    before update on public.finance_budgets
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.finance_budgets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='finance_budgets' and policyname='finance_budgets_select'
  ) then
    create policy finance_budgets_select
      on public.finance_budgets
      for select
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='finance_budgets' and policyname='finance_budgets_insert'
  ) then
    create policy finance_budgets_insert
      on public.finance_budgets
      for insert
      to authenticated
      with check (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
        and (created_by is null or created_by = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='finance_budgets' and policyname='finance_budgets_update'
  ) then
    create policy finance_budgets_update
      on public.finance_budgets
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

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='finance_budgets' and policyname='finance_budgets_delete'
  ) then
    create policy finance_budgets_delete
      on public.finance_budgets
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;
