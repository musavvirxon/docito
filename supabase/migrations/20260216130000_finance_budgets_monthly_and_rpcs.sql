-- File: supabase/migrations/20260216130000_finance_budgets_monthly_and_rpcs.sql
-- Adds a conflict-free monthly budgets table and the RPCs used by the financial UI:
--   finance_budget_upsert, finance_budget_list, finance_budget_vs_actual
-- This avoids conflicts with the existing finance_budgets table (category budgets) created earlier.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Table
create table if not exists public.finance_budgets_monthly (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  month date not null,
  entry_type text not null check (entry_type in ('income', 'expense', 'payroll')),
  category_id uuid null references public.finance_categories(id) on delete set null,

  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',

  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness:
-- - allow one "overall" budget per (entity, month, entry_type) when category_id IS NULL
-- - allow one category budget per (entity, month, entry_type, category_id) when category_id IS NOT NULL
create unique index if not exists finance_budgets_monthly_unique_overall
  on public.finance_budgets_monthly (entity_type, entity_id, month, entry_type)
  where category_id is null;

create unique index if not exists finance_budgets_monthly_unique_category
  on public.finance_budgets_monthly (entity_type, entity_id, month, entry_type, category_id)
  where category_id is not null;

create index if not exists finance_budgets_monthly_entity_month_idx
  on public.finance_budgets_monthly (entity_type, entity_id, month);

create index if not exists finance_budgets_monthly_entry_type_idx
  on public.finance_budgets_monthly (entry_type);

create index if not exists finance_budgets_monthly_category_idx
  on public.finance_budgets_monthly (category_id);

-- updated columns trigger (updated_at + updated_by)
drop trigger if exists finance_budgets_monthly_set_updated_columns on public.finance_budgets_monthly;
create trigger finance_budgets_monthly_set_updated_columns
before update on public.finance_budgets_monthly
for each row execute function public.tg_set_updated_columns();

-- RLS
alter table public.finance_budgets_monthly enable row level security;

drop policy if exists "Budget monthly select" on public.finance_budgets_monthly;
create policy "Budget monthly select"
  on public.finance_budgets_monthly
  for select
  to authenticated
  using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "Budget monthly insert" on public.finance_budgets_monthly;
create policy "Budget monthly insert"
  on public.finance_budgets_monthly
  for insert
  to authenticated
  with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "Budget monthly update" on public.finance_budgets_monthly;
create policy "Budget monthly update"
  on public.finance_budgets_monthly
  for update
  to authenticated
  using (public.can_access_entity(entity_type, entity_id))
  with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "Budget monthly delete" on public.finance_budgets_monthly;
create policy "Budget monthly delete"
  on public.finance_budgets_monthly
  for delete
  to authenticated
  using (public.can_access_entity(entity_type, entity_id));

-- RPC: upsert a budget row (supports category_id NULL or NOT NULL)
drop function if exists public.finance_budget_upsert(
  text, uuid, date, text, bigint, text, uuid
);

create or replace function public.finance_budget_upsert(
  p_entity_type text,
  p_entity_id uuid,
  p_month date,
  p_entry_type text,
  p_amount_cents bigint,
  p_currency text,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_type text := lower(trim(p_entry_type));
  v_currency text := upper(trim(p_currency));
  v_id uuid;
begin
  if v_entry_type not in ('income', 'expense', 'payroll') then
    raise exception 'invalid entry_type: %', p_entry_type;
  end if;

  if p_month is null then
    raise exception 'month is required';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'amount_cents must be >= 0';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'not authorized';
  end if;

  if p_category_id is null then
    insert into public.finance_budgets_monthly (
      entity_type, entity_id, month, entry_type, category_id,
      amount_cents, currency,
      created_by, updated_by
    )
    values (
      p_entity_type, p_entity_id, p_month, v_entry_type, null,
      p_amount_cents, v_currency,
      auth.uid(), auth.uid()
    )
    on conflict (entity_type, entity_id, month, entry_type) where category_id is null
    do update set
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      updated_by = auth.uid(),
      updated_at = now()
    returning id into v_id;
  else
    insert into public.finance_budgets_monthly (
      entity_type, entity_id, month, entry_type, category_id,
      amount_cents, currency,
      created_by, updated_by
    )
    values (
      p_entity_type, p_entity_id, p_month, v_entry_type, p_category_id,
      p_amount_cents, v_currency,
      auth.uid(), auth.uid()
    )
    on conflict (entity_type, entity_id, month, entry_type, category_id)
    where category_id is not null
    do update set
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      updated_by = auth.uid(),
      updated_at = now()
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- RPC: list budgets in a month range
drop function if exists public.finance_budget_list(
  text, uuid, date, date
);

create or replace function public.finance_budget_list(
  p_entity_type text,
  p_entity_id uuid,
  p_month_from date,
  p_month_to date
)
returns table (
  id uuid,
  month date,
  entry_type text,
  category_id uuid,
  amount_cents bigint,
  currency text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    b.id,
    b.month,
    b.entry_type,
    b.category_id,
    b.amount_cents,
    b.currency,
    b.updated_at
  from public.finance_budgets_monthly b
  where b.entity_type = p_entity_type
    and b.entity_id = p_entity_id
    and b.month >= p_month_from
    and b.month <= p_month_to
  order by b.month desc, b.entry_type asc, b.category_id nulls first, b.updated_at desc;
end;
$$;

-- RPC: budget vs actual
drop function if exists public.finance_budget_vs_actual(
  text, uuid, date, date, text
);

create or replace function public.finance_budget_vs_actual(
  p_entity_type text,
  p_entity_id uuid,
  p_month_from date,
  p_month_to date,
  p_entry_type text default null
)
returns table (
  month date,
  entry_type text,
  category_id uuid,
  category_name text,
  budget_cents bigint,
  actual_cents bigint,
  variance bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter_entry_type text := case when p_entry_type is null then null else lower(trim(p_entry_type)) end;
begin
  if v_filter_entry_type is not null and v_filter_entry_type not in ('income', 'expense', 'payroll') then
    raise exception 'invalid entry_type filter: %', p_entry_type;
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'not authorized';
  end if;

  return query
  with budgets as (
    select
      b.month,
      b.entry_type,
      b.category_id,
      b.amount_cents::bigint as budget_cents
    from public.finance_budgets_monthly b
    where b.entity_type = p_entity_type
      and b.entity_id = p_entity_id
      and b.month >= p_month_from
      and b.month <= p_month_to
      and (v_filter_entry_type is null or b.entry_type = v_filter_entry_type)
  ),
  actuals_by_category as (
    select
      date_trunc('month', e.occurred_at)::date as month,
      e.entry_type::text as entry_type,
      e.category_id,
      sum(e.amount_cents)::bigint as actual_cents
    from public.finance_entries e
    where e.entity_type = p_entity_type
      and e.entity_id = p_entity_id
      and date_trunc('month', e.occurred_at)::date >= p_month_from
      and date_trunc('month', e.occurred_at)::date <= p_month_to
      and (v_filter_entry_type is null or e.entry_type::text = v_filter_entry_type)
      and e.category_id is not null
    group by 1,2,3
  ),
  actuals_overall as (
    select
      date_trunc('month', e.occurred_at)::date as month,
      e.entry_type::text as entry_type,
      null::uuid as category_id,
      sum(e.amount_cents)::bigint as actual_cents
    from public.finance_entries e
    where e.entity_type = p_entity_type
      and e.entity_id = p_entity_id
      and date_trunc('month', e.occurred_at)::date >= p_month_from
      and date_trunc('month', e.occurred_at)::date <= p_month_to
      and (v_filter_entry_type is null or e.entry_type::text = v_filter_entry_type)
    group by 1,2
  ),
  actuals as (
    select * from actuals_by_category
    union all
    select * from actuals_overall
  ),
  keys as (
    select month, entry_type, category_id from budgets
    union
    select month, entry_type, category_id from actuals
  )
  select
    k.month,
    k.entry_type,
    k.category_id,
    coalesce(c.name, 'Overall') as category_name,
    coalesce(b.budget_cents, 0)::bigint as budget_cents,
    coalesce(a.actual_cents, 0)::bigint as actual_cents,
    (coalesce(b.budget_cents, 0) - coalesce(a.actual_cents, 0))::bigint as variance
  from keys k
  left join budgets b
    on b.month = k.month
    and b.entry_type = k.entry_type
    and b.category_id is not distinct from k.category_id
  left join actuals a
    on a.month = k.month
    and a.entry_type = k.entry_type
    and a.category_id is not distinct from k.category_id
  left join public.finance_categories c
    on c.id = k.category_id
  order by k.month desc, k.entry_type asc, k.category_id nulls first;

end;
$$;

-- Grants
revoke all on function public.finance_budget_upsert(text, uuid, date, text, bigint, text, uuid) from public;
revoke all on function public.finance_budget_list(text, uuid, date, date) from public;
revoke all on function public.finance_budget_vs_actual(text, uuid, date, date, text) from public;

grant execute on function public.finance_budget_upsert(text, uuid, date, text, bigint, text, uuid) to authenticated;
grant execute on function public.finance_budget_list(text, uuid, date, date) to authenticated;
grant execute on function public.finance_budget_vs_actual(text, uuid, date, date, text) to authenticated;

commit;
