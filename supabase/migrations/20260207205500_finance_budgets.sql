-- File: supabase/migrations/20260207205500_finance_budgets.sql
-- B22: Budgets (tables + RLS + RPCs)
-- Idempotent: create-if-not-exists patterns + create or replace functions

begin;

-- -----------------------------
-- Table: finance_budgets
-- -----------------------------
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,

  -- budget "period" stored as first day of month (UTC)
  month date not null,

  -- optional category budget, null means "overall" budget for entry_type
  category_id uuid null,

  -- 'income' | 'expense' | 'payroll'
  entry_type text not null check (entry_type in ('income','expense','payroll')),

  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid()
);

-- Unique per entity/month/type/category
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname='public' and indexname='finance_budgets_unique_entity_month_type_cat'
  ) then
    create unique index finance_budgets_unique_entity_month_type_cat
      on public.finance_budgets(entity_type, entity_id, month, entry_type, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));
  end if;
end $$;

-- Helpful indexes
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_budgets_entity_month_idx'
  ) then
    create index finance_budgets_entity_month_idx
      on public.finance_budgets(entity_type, entity_id, month);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_budgets_entity_entry_type_idx'
  ) then
    create index finance_budgets_entity_entry_type_idx
      on public.finance_budgets(entity_type, entity_id, entry_type);
  end if;
end $$;

-- Updated-at trigger (best-effort, only if the helper exists)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_finance_budgets_updated_at on public.finance_budgets;
    create trigger trg_finance_budgets_updated_at
    before update on public.finance_budgets
    for each row
    execute function public.set_updated_at();
  end if;
exception when others then
  -- ignore if helper not present
  null;
end $$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.finance_budgets enable row level security;

drop policy if exists "finance_budgets_select" on public.finance_budgets;
drop policy if exists "finance_budgets_insert" on public.finance_budgets;
drop policy if exists "finance_budgets_update" on public.finance_budgets;
drop policy if exists "finance_budgets_delete" on public.finance_budgets;

create policy "finance_budgets_select"
on public.finance_budgets
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

create policy "finance_budgets_insert"
on public.finance_budgets
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

create policy "finance_budgets_update"
on public.finance_budgets
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

create policy "finance_budgets_delete"
on public.finance_budgets
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- -----------------------------
-- RPC: finance_budget_upsert
-- -----------------------------
create or replace function public.finance_budget_upsert(
  p_entity_type text,
  p_entity_id uuid,
  p_month date,
  p_entry_type text,
  p_amount_cents bigint,
  p_currency text,
  p_category_id uuid default null
)
returns table (budget_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_budget_id uuid;
  v_entry text := nullif(btrim(coalesce(p_entry_type,'')), '');
  v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), ''));
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  if p_month is null then
    raise exception 'month required';
  end if;

  if v_entry is null or v_entry not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'Invalid amount';
  end if;

  if v_cur is null then
    v_cur := 'USD';
  end if;

  -- Upsert by unique key
  insert into public.finance_budgets (
    entity_type, entity_id, month, entry_type, category_id,
    amount_cents, currency,
    created_by, updated_by
  )
  values (
    p_entity_type, p_entity_id, p_month, v_entry, p_category_id,
    p_amount_cents, v_cur,
    v_uid, v_uid
  )
  on conflict (entity_type, entity_id, month, entry_type, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    updated_at = now(),
    updated_by = v_uid
  returning id into v_budget_id;

  return query select v_budget_id as budget_id;
end;
$$;

revoke all on function public.finance_budget_upsert(text, uuid, date, text, bigint, text, uuid) from public;
grant execute on function public.finance_budget_upsert(text, uuid, date, text, bigint, text, uuid) to authenticated;

-- -----------------------------
-- RPC: finance_budget_list
-- -----------------------------
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
declare
  v_uid uuid := auth.uid();
  v_from date := coalesce(p_month_from, (date_trunc('month', now())::date - interval '6 months')::date);
  v_to date := coalesce(p_month_to, date_trunc('month', now())::date);
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
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
  from public.finance_budgets b
  where b.entity_type = p_entity_type
    and b.entity_id = p_entity_id
    and b.month >= v_from
    and b.month <= v_to
  order by b.month asc, b.entry_type asc, b.category_id nulls first;
end;
$$;

revoke all on function public.finance_budget_list(text, uuid, date, date) from public;
grant execute on function public.finance_budget_list(text, uuid, date, date) to authenticated;

-- -----------------------------
-- RPC: finance_budget_vs_actual
-- -----------------------------
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
  variance_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from date := coalesce(p_month_from, (date_trunc('month', now())::date - interval '6 months')::date);
  v_to date := coalesce(p_month_to, date_trunc('month', now())::date);
  v_entry text := nullif(btrim(coalesce(p_entry_type,'')), '');
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  if v_entry is not null and v_entry not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type';
  end if;

  return query
  with months as (
    select generate_series(v_from::date, v_to::date, interval '1 month')::date as month
  ),
  budgets as (
    select
      b.month,
      b.entry_type,
      b.category_id,
      sum(b.amount_cents)::bigint as budget_cents
    from public.finance_budgets b
    where b.entity_type = p_entity_type
      and b.entity_id = p_entity_id
      and b.month >= v_from
      and b.month <= v_to
      and (v_entry is null or b.entry_type = v_entry)
    group by 1,2,3
  ),
  actuals as (
    select
      date_trunc('month', e.occurred_at)::date as month,
      e.entry_type::text as entry_type,
      e.category_id,
      sum(e.amount_cents)::bigint as actual_cents
    from public.finance_entries e
    where e.entity_type = p_entity_type
      and e.entity_id = p_entity_id
      and e.occurred_at >= (v_from::timestamptz)
      and e.occurred_at < ((v_to::date + interval '1 month')::timestamptz)
      and (v_entry is null or e.entry_type::text = v_entry)
    group by 1,2,3
  ),
  merged as (
    select
      coalesce(b.month, a.month) as month,
      coalesce(b.entry_type, a.entry_type) as entry_type,
      coalesce(b.category_id, a.category_id) as category_id,
      coalesce(b.budget_cents, 0)::bigint as budget_cents,
      coalesce(a.actual_cents, 0)::bigint as actual_cents
    from budgets b
    full join actuals a
      on a.month = b.month
     and a.entry_type = b.entry_type
     and (a.category_id is not distinct from b.category_id)
  )
  select
    m.month,
    m.entry_type,
    m.category_id,
    coalesce(c.name, case when m.category_id is null then 'Overall' else 'Uncategorized' end) as category_name,
    m.budget_cents,
    m.actual_cents,
    (m.budget_cents - m.actual_cents)::bigint as variance_cents
  from merged m
  left join public.finance_categories c
    on c.id = m.category_id
   and c.entity_type = p_entity_type
   and c.entity_id = p_entity_id
  order by m.month asc, m.entry_type asc, m.category_id nulls first;
end;
$$;

revoke all on function public.finance_budget_vs_actual(text, uuid, date, date, text) from public;
grant execute on function public.finance_budget_vs_actual(text, uuid, date, date, text) to authenticated;

commit;
