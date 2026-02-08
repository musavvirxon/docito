-- File: supabase/migrations/20260207170000_finance_budgets_recurring.sql
-- B1: Budgets + recurring expense buckets (supplies/utilities/taxes) schema
-- Idempotent migration

begin;

-- 0) updated_at trigger helper (if not already present)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    -- ok
  else
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end$$;

-- 1) enums for recurring frequency
do $$
begin
  if not exists (select 1 from pg_type where typname = 'finance_recurring_frequency') then
    create type public.finance_recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
  end if;
end$$;

-- 2) Budget periods (e.g. monthly plan)
create table if not exists public.finance_budget_periods (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  period_start date not null,
  period_end date not null,

  label text null,
  currency text not null default 'USD',

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint finance_budget_periods_dates check (period_end >= period_start)
);

create unique index if not exists finance_budget_periods_unique
  on public.finance_budget_periods(entity_type, entity_id, period_start, period_end);

create index if not exists finance_budget_periods_entity_idx
  on public.finance_budget_periods(entity_type, entity_id, period_start desc);

alter table public.finance_budget_periods enable row level security;

drop trigger if exists trg_finance_budget_periods_updated_at on public.finance_budget_periods;
create trigger trg_finance_budget_periods_updated_at
before update on public.finance_budget_periods
for each row execute function public.set_updated_at();

-- RLS: budgets
drop policy if exists "finance_budget_periods_select" on public.finance_budget_periods;
create policy "finance_budget_periods_select"
on public.finance_budget_periods
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budget_periods_insert" on public.finance_budget_periods;
create policy "finance_budget_periods_insert"
on public.finance_budget_periods
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_budget_periods_update" on public.finance_budget_periods;
create policy "finance_budget_periods_update"
on public.finance_budget_periods
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budget_periods_delete" on public.finance_budget_periods;
create policy "finance_budget_periods_delete"
on public.finance_budget_periods
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 3) Budget lines: category planned amounts
create table if not exists public.finance_budget_lines (
  id uuid primary key default gen_random_uuid(),

  budget_period_id uuid not null references public.finance_budget_periods(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  category_id uuid not null references public.finance_categories(id) on delete restrict,

  planned_amount_cents integer not null default 0 check (planned_amount_cents >= 0),

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_budget_lines_unique
  on public.finance_budget_lines(budget_period_id, category_id);

create index if not exists finance_budget_lines_entity_idx
  on public.finance_budget_lines(entity_type, entity_id);

create index if not exists finance_budget_lines_category_idx
  on public.finance_budget_lines(category_id);

alter table public.finance_budget_lines enable row level security;

drop trigger if exists trg_finance_budget_lines_updated_at on public.finance_budget_lines;
create trigger trg_finance_budget_lines_updated_at
before update on public.finance_budget_lines
for each row execute function public.set_updated_at();

-- RLS: budget lines
drop policy if exists "finance_budget_lines_select" on public.finance_budget_lines;
create policy "finance_budget_lines_select"
on public.finance_budget_lines
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budget_lines_insert" on public.finance_budget_lines;
create policy "finance_budget_lines_insert"
on public.finance_budget_lines
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budget_lines_update" on public.finance_budget_lines;
create policy "finance_budget_lines_update"
on public.finance_budget_lines
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_budget_lines_delete" on public.finance_budget_lines;
create policy "finance_budget_lines_delete"
on public.finance_budget_lines
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 4) Recurring expenses: utilities/taxes/supplies templates
create table if not exists public.finance_recurring_expenses (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  category_id uuid not null references public.finance_categories(id) on delete restrict,

  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',

  description text not null default '',

  frequency public.finance_recurring_frequency not null default 'monthly',

  -- scheduling helpers:
  -- weekly: weekday (0=Sun .. 6=Sat)
  weekday smallint null check (weekday is null or (weekday >= 0 and weekday <= 6)),
  -- monthly: day of month (1..31)
  day_of_month smallint null check (day_of_month is null or (day_of_month >= 1 and day_of_month <= 31)),

  autopost boolean not null default false,
  is_active boolean not null default true,

  last_posted_at timestamptz null,
  next_run_at timestamptz not null default now(),

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_recurring_expenses_entity_idx
  on public.finance_recurring_expenses(entity_type, entity_id);

create index if not exists finance_recurring_expenses_due_idx
  on public.finance_recurring_expenses(entity_type, entity_id, next_run_at)
  where is_active = true;

create index if not exists finance_recurring_expenses_category_idx
  on public.finance_recurring_expenses(category_id);

alter table public.finance_recurring_expenses enable row level security;

drop trigger if exists trg_finance_recurring_expenses_updated_at on public.finance_recurring_expenses;
create trigger trg_finance_recurring_expenses_updated_at
before update on public.finance_recurring_expenses
for each row execute function public.set_updated_at();

-- RLS: recurring expenses
drop policy if exists "finance_recurring_expenses_select" on public.finance_recurring_expenses;
create policy "finance_recurring_expenses_select"
on public.finance_recurring_expenses
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_recurring_expenses_insert" on public.finance_recurring_expenses;
create policy "finance_recurring_expenses_insert"
on public.finance_recurring_expenses
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_recurring_expenses_update" on public.finance_recurring_expenses;
create policy "finance_recurring_expenses_update"
on public.finance_recurring_expenses
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_recurring_expenses_delete" on public.finance_recurring_expenses;
create policy "finance_recurring_expenses_delete"
on public.finance_recurring_expenses
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

commit;
