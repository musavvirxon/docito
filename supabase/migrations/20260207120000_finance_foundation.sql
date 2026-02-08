-- File: supabase/migrations/20260207120000_finance_foundation.sql

/*
  Step 2: Finance foundation tables (categories, ledger entries, budgets)
  Requirements:
  - New migration (unique timestamp)
  - Idempotent SQL (IF NOT EXISTS / DO blocks)
  - RLS enabled + policies using public.has_entity_access(entity_type, entity_id)
*/

-- Ensure required extensions exist (safe / idempotent)
create extension if not exists pgcrypto;

-- -----------------------------
-- Helpers
-- -----------------------------
create or replace function public.tg_set_updated_columns()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- -----------------------------
-- finance_categories
-- -----------------------------
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  kind text not null, -- 'income' | 'expense' | 'transfer' | 'adjustment' | 'payroll'
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_categories_entity_type_chk'
  ) then
    alter table public.finance_categories
      add constraint finance_categories_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_categories_kind_chk'
  ) then
    alter table public.finance_categories
      add constraint finance_categories_kind_chk
      check (kind in ('income','expense','transfer','adjustment','payroll'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_categories_entity_name_uniq'
  ) then
    alter table public.finance_categories
      add constraint finance_categories_entity_name_uniq
      unique (entity_type, entity_id, kind, name);
  end if;
end $$;

create index if not exists finance_categories_entity_idx
  on public.finance_categories (entity_type, entity_id);

create index if not exists finance_categories_kind_idx
  on public.finance_categories (kind);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_finance_categories_updated'
  ) then
    create trigger tg_finance_categories_updated
    before update on public.finance_categories
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.finance_categories enable row level security;

do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_categories'
      and policyname = 'finance_categories_select'
  ) then
    create policy finance_categories_select
      on public.finance_categories
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
      and tablename = 'finance_categories'
      and policyname = 'finance_categories_insert'
  ) then
    create policy finance_categories_insert
      on public.finance_categories
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
      and tablename = 'finance_categories'
      and policyname = 'finance_categories_update'
  ) then
    create policy finance_categories_update
      on public.finance_categories
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
      and tablename = 'finance_categories'
      and policyname = 'finance_categories_delete'
  ) then
    create policy finance_categories_delete
      on public.finance_categories
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;

-- -----------------------------
-- finance_entries (ledger)
-- -----------------------------
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  entry_type text not null, -- 'income' | 'expense' | 'transfer' | 'adjustment' | 'payroll'
  category_id uuid references public.finance_categories(id) on delete set null,
  amount_cents bigint not null,
  currency text not null default 'USD',
  occurred_at timestamptz not null default now(),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_entries_entity_type_chk'
  ) then
    alter table public.finance_entries
      add constraint finance_entries_entity_type_chk
      check (entity_type in ('practice','lab','pharmacy','imaging_center'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_entries_entry_type_chk'
  ) then
    alter table public.finance_entries
      add constraint finance_entries_entry_type_chk
      check (entry_type in ('income','expense','transfer','adjustment','payroll'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_entries_amount_nonzero_chk'
  ) then
    alter table public.finance_entries
      add constraint finance_entries_amount_nonzero_chk
      check (amount_cents <> 0);
  end if;
end $$;

create index if not exists finance_entries_entity_occurred_idx
  on public.finance_entries (entity_type, entity_id, occurred_at desc);

create index if not exists finance_entries_category_idx
  on public.finance_entries (category_id);

create index if not exists finance_entries_entry_type_idx
  on public.finance_entries (entry_type);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tg_finance_entries_updated'
  ) then
    create trigger tg_finance_entries_updated
    before update on public.finance_entries
    for each row
    execute function public.tg_set_updated_columns();
  end if;
end $$;

alter table public.finance_entries enable row level security;

do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_entries'
      and policyname = 'finance_entries_select'
  ) then
    create policy finance_entries_select
      on public.finance_entries
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
      and tablename = 'finance_entries'
      and policyname = 'finance_entries_insert'
  ) then
    create policy finance_entries_insert
      on public.finance_entries
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
      and tablename = 'finance_entries'
      and policyname = 'finance_entries_update'
  ) then
    create policy finance_entries_update
      on public.finance_entries
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
      and tablename = 'finance_entries'
      and policyname = 'finance_entries_delete'
  ) then
    create policy finance_entries_delete
      on public.finance_entries
      for delete
      to authenticated
      using (
        auth.uid() is not null
        and public.has_entity_access(entity_type, entity_id)
      );
  end if;
end $$;

-- -----------------------------
-- finance_budgets (monthly budgets)
-- -----------------------------
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  period_start date not null, -- recommended: first day of month
  amount_cents bigint not null,
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
    where conname = 'finance_budgets_amount_positive_chk'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_amount_positive_chk
      check (amount_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_budgets_unique_period'
  ) then
    alter table public.finance_budgets
      add constraint finance_budgets_unique_period
      unique (entity_type, entity_id, category_id, period_start);
  end if;
end $$;

create index if not exists finance_budgets_entity_period_idx
  on public.finance_budgets (entity_type, entity_id, period_start desc);

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
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_budgets'
      and policyname = 'finance_budgets_select'
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

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_budgets'
      and policyname = 'finance_budgets_insert'
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

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_budgets'
      and policyname = 'finance_budgets_update'
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

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_budgets'
      and policyname = 'finance_budgets_delete'
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

-- -----------------------------
-- Seed common expense categories (idempotent)
-- NOTE: These are per-entity; we seed only "templates" by leaving this for UI to copy later.
-- For now we do not insert rows because each entity_id differs.
-- -----------------------------
