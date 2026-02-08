-- File: supabase/migrations/20260207140000_finance_core.sql
-- Finance core tables for unified clinic/lab/imaging/pharmacy analytics + budgets + exports
-- Idempotent migration (safe to re-run)

begin;

-- -------------------------------
-- 0) Enums
-- -------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'finance_entry_type') then
    create type public.finance_entry_type as enum (
      'income',
      'expense',
      'payroll',
      'transfer',
      'adjustment'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'finance_category_kind') then
    create type public.finance_category_kind as enum (
      'income',
      'expense',
      'payroll'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'finance_payroll_status') then
    create type public.finance_payroll_status as enum (
      'draft',
      'approved',
      'paid',
      'canceled'
    );
  end if;
end$$;

-- -------------------------------
-- 1) Categories (for analytics + budgets)
-- -------------------------------
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,
  kind public.finance_category_kind not null,
  name text not null,
  name_norm text generated always as (lower(trim(name))) stored,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_categories_unique_per_entity
  on public.finance_categories (entity_type, entity_id, kind, name_norm);

create index if not exists finance_categories_entity_idx
  on public.finance_categories (entity_type, entity_id);

alter table public.finance_categories enable row level security;

-- -------------------------------
-- 2) Entries (transactions)
-- -------------------------------
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  occurred_at timestamptz not null default now(),
  entry_type public.finance_entry_type not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',
  category_id uuid references public.finance_categories(id) on delete set null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_entries_entity_time_idx
  on public.finance_entries (entity_type, entity_id, occurred_at desc);

create index if not exists finance_entries_entity_type_idx
  on public.finance_entries (entity_type, entity_id, entry_type);

create index if not exists finance_entries_category_idx
  on public.finance_entries (category_id);

alter table public.finance_entries enable row level security;

-- -------------------------------
-- 3) Budgets (monthly per category)
-- -------------------------------
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  month_start date not null, -- YYYY-MM-01
  budget_cents bigint not null default 0 check (budget_cents >= 0),
  currency text not null default 'USD',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_budgets_unique
  on public.finance_budgets (entity_type, entity_id, category_id, month_start);

create index if not exists finance_budgets_entity_month_idx
  on public.finance_budgets (entity_type, entity_id, month_start);

alter table public.finance_budgets enable row level security;

-- -------------------------------
-- 4) Payroll (minimal tables for exports; payroll engine can evolve later)
-- -------------------------------
create table if not exists public.finance_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  period_start date not null,
  period_end date not null,
  schedule text not null default 'monthly', -- monthly/weekly/daily/per_visit/hourly etc
  status public.finance_payroll_status not null default 'draft',
  currency text not null default 'USD',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_payroll_runs_entity_period_idx
  on public.finance_payroll_runs (entity_type, entity_id, period_start desc, period_end desc);

alter table public.finance_payroll_runs enable row level security;

create table if not exists public.finance_payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.finance_payroll_runs(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  staff_user_id uuid references auth.users(id) on delete set null,
  staff_name text,
  basis text not null default 'fixed', -- fixed/commission/hourly/per_visit/etc
  units numeric not null default 0,
  rate_bps integer, -- commission in basis points (e.g., 1500 = 15.00%)
  rate_cents bigint, -- for fixed/hourly
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists finance_payroll_items_run_idx
  on public.finance_payroll_items (payroll_run_id);

create index if not exists finance_payroll_items_entity_idx
  on public.finance_payroll_items (entity_type, entity_id);

alter table public.finance_payroll_items enable row level security;

-- -------------------------------
-- 5) updated_at trigger helper
-- -------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_categories_updated_at on public.finance_categories;
create trigger trg_finance_categories_updated_at
before update on public.finance_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_entries_updated_at on public.finance_entries;
create trigger trg_finance_entries_updated_at
before update on public.finance_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_budgets_updated_at on public.finance_budgets;
create trigger trg_finance_budgets_updated_at
before update on public.finance_budgets
for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_payroll_runs_updated_at on public.finance_payroll_runs;
create trigger trg_finance_payroll_runs_updated_at
before update on public.finance_payroll_runs
for each row execute function public.set_updated_at();

-- -------------------------------
-- 6) RLS Policies (use existing unified access: can_access_entity)
-- -------------------------------

-- finance_categories
drop policy if exists "finance_categories_select" on public.finance_categories;
create policy "finance_categories_select"
on public.finance_categories
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_categories_insert" on public.finance_categories;
create policy "finance_categories_insert"
on public.finance_categories
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_categories_update" on public.finance_categories;
create policy "finance_categories_update"
on public.finance_categories
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_categories_delete" on public.finance_categories;
create policy "finance_categories_delete"
on public.finance_categories
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- finance_entries
drop policy if exists "finance_entries_select" on public.finance_entries;
create policy "finance_entries_select"
on public.finance_entries
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_entries_insert" on public.finance_entries;
create policy "finance_entries_insert"
on public.finance_entries
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_entries_update" on public.finance_entries;
create policy "finance_entries_update"
on public.finance_entries
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_entries_delete" on public.finance_entries;
create policy "finance_entries_delete"
on public.finance_entries
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- finance_budgets
drop policy if exists "finance_budgets_select" on public.finance_budgets;
create policy "finance_budgets_select"
on public.finance_budgets
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budgets_insert" on public.finance_budgets;
create policy "finance_budgets_insert"
on public.finance_budgets
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_budgets_update" on public.finance_budgets;
create policy "finance_budgets_update"
on public.finance_budgets
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budgets_delete" on public.finance_budgets;
create policy "finance_budgets_delete"
on public.finance_budgets
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- finance_payroll_runs
drop policy if exists "finance_payroll_runs_select" on public.finance_payroll_runs;
create policy "finance_payroll_runs_select"
on public.finance_payroll_runs
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_runs_insert" on public.finance_payroll_runs;
create policy "finance_payroll_runs_insert"
on public.finance_payroll_runs
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_payroll_runs_update" on public.finance_payroll_runs;
create policy "finance_payroll_runs_update"
on public.finance_payroll_runs
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_runs_delete" on public.finance_payroll_runs;
create policy "finance_payroll_runs_delete"
on public.finance_payroll_runs
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- finance_payroll_items
drop policy if exists "finance_payroll_items_select" on public.finance_payroll_items;
create policy "finance_payroll_items_select"
on public.finance_payroll_items
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_insert" on public.finance_payroll_items;
create policy "finance_payroll_items_insert"
on public.finance_payroll_items
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_update" on public.finance_payroll_items;
create policy "finance_payroll_items_update"
on public.finance_payroll_items
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_payroll_items_delete" on public.finance_payroll_items;
create policy "finance_payroll_items_delete"
on public.finance_payroll_items
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

commit;
