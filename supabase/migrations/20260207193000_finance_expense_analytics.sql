-- File: supabase/migrations/20260207193000_finance_expense_analytics.sql
-- B12: Finance analytics for expenses (utilities/taxes/supplies slices via categories)
-- - Adds view: finance_expense_monthly_by_category_v
-- - Adds RPC: finance_expense_breakdown(entity_type, entity_id, start_month, end_month)
-- - Adds helpful indexes (idempotent)

begin;

-- Helpful indexes for analytics (safe if already exist)
create index if not exists finance_entries_expense_entity_date_idx
  on public.finance_entries (entity_type, entity_id, occurred_at)
  where entry_type = 'expense';

create index if not exists finance_entries_expense_entity_category_date_idx
  on public.finance_entries (entity_type, entity_id, category_id, occurred_at)
  where entry_type = 'expense';

-- 1) View: monthly totals by category for expenses
create or replace view public.finance_expense_monthly_by_category_v as
select
  e.entity_type,
  e.entity_id,
  (date_trunc('month', (e.occurred_at at time zone 'utc'))::date) as month_start,
  e.currency,
  e.category_id,
  c.name as category_name,
  sum(e.amount_cents)::bigint as amount_cents
from public.finance_entries e
join public.finance_categories c
  on c.id = e.category_id
where e.entry_type = 'expense'
group by
  e.entity_type,
  e.entity_id,
  (date_trunc('month', (e.occurred_at at time zone 'utc'))::date),
  e.currency,
  e.category_id,
  c.name;

-- 2) RPC: Expense breakdown for a month range (inclusive)
create or replace function public.finance_expense_breakdown(
  p_entity_type text,
  p_entity_id uuid,
  p_start_month date,
  p_end_month date
)
returns table (
  month_start date,
  currency text,
  category_id uuid,
  category_name text,
  amount_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if p_start_month is null or p_end_month is null then
    raise exception 'start_month and end_month required';
  end if;

  if p_end_month < p_start_month then
    raise exception 'end_month must be >= start_month';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    v.month_start,
    v.currency,
    v.category_id,
    v.category_name,
    v.amount_cents
  from public.finance_expense_monthly_by_category_v v
  where v.entity_type = p_entity_type
    and v.entity_id = p_entity_id
    and v.month_start >= date_trunc('month', p_start_month)::date
    and v.month_start <= date_trunc('month', p_end_month)::date
  order by v.month_start desc, v.amount_cents desc, v.category_name asc;
end;
$$;

revoke all on function public.finance_expense_breakdown(text, uuid, date, date) from public;
grant execute on function public.finance_expense_breakdown(text, uuid, date, date) to authenticated;

commit;
