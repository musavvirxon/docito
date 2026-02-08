-- File: supabase/migrations/20260207173000_finance_budget_actuals_view.sql
-- B4: Connect budgets to actual spend (Budget vs Actual)
-- - Adds a view finance_budget_actuals_v
-- - Adds an RPC finance_budget_get(period_id) for frontend use
-- Idempotent migration

begin;

-- 1) Budget vs actual view
-- Assumptions about finance_entries schema:
-- - public.finance_entries has: entity_type, entity_id, entry_type, amount_cents, occurred_at, category_id, currency
-- - entry_type uses 'expense' for expenses
create or replace view public.finance_budget_actuals_v as
select
  p.id as budget_period_id,
  p.entity_type,
  p.entity_id,
  p.period_start,
  p.period_end,
  p.currency as budget_currency,

  l.id as budget_line_id,
  l.category_id,
  c.name as category_name,
  l.planned_amount_cents,

  coalesce(a.actual_amount_cents, 0) as actual_amount_cents,
  (l.planned_amount_cents - coalesce(a.actual_amount_cents, 0)) as variance_amount_cents,

  l.notes as line_notes,
  l.metadata as line_metadata,

  p.label as period_label,
  p.notes as period_notes,
  p.metadata as period_metadata
from public.finance_budget_periods p
join public.finance_budget_lines l
  on l.budget_period_id = p.id
join public.finance_categories c
  on c.id = l.category_id
left join (
  select
    bl.budget_period_id,
    bl.category_id,
    sum(e.amount_cents)::int as actual_amount_cents
  from public.finance_budget_lines bl
  join public.finance_budget_periods bp
    on bp.id = bl.budget_period_id
  join public.finance_entries e
    on e.entity_type = bp.entity_type
   and e.entity_id = bp.entity_id
   and e.entry_type = 'expense'
   and e.category_id = bl.category_id
   -- occurred_at is timestamptz; budget periods are dates.
   -- Use date comparison inclusive.
   and (e.occurred_at at time zone 'utc')::date >= bp.period_start
   and (e.occurred_at at time zone 'utc')::date <= bp.period_end
  group by bl.budget_period_id, bl.category_id
) a
  on a.budget_period_id = p.id
 and a.category_id = l.category_id;

-- 2) RPC: fetch budget lines + actuals for a period
-- Security:
-- - Validates the user can access entity of the period using can_access_entity
create or replace function public.finance_budget_get(p_budget_period_id uuid)
returns table (
  budget_period_id uuid,
  entity_type text,
  entity_id uuid,
  period_start date,
  period_end date,
  budget_currency text,
  period_label text,
  period_notes text,
  category_id uuid,
  category_name text,
  planned_amount_cents integer,
  actual_amount_cents integer,
  variance_amount_cents integer,
  budget_line_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p record;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select
    id,
    entity_type,
    entity_id,
    period_start,
    period_end,
    currency,
    label,
    notes
  into v_p
  from public.finance_budget_periods
  where id = p_budget_period_id;

  if v_p.id is null then
    raise exception 'Budget period not found';
  end if;

  if not public.can_access_entity(v_p.entity_type, v_p.entity_id) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    v.budget_period_id,
    v.entity_type,
    v.entity_id,
    v.period_start,
    v.period_end,
    v.budget_currency,
    v.period_label,
    v.period_notes,
    v.category_id,
    v.category_name,
    v.planned_amount_cents,
    v.actual_amount_cents,
    v.variance_amount_cents,
    v.budget_line_id
  from public.finance_budget_actuals_v v
  where v.budget_period_id = p_budget_period_id
  order by v.planned_amount_cents desc, v.category_name asc;
end;
$$;

revoke all on function public.finance_budget_get(uuid) from public;
grant execute on function public.finance_budget_get(uuid) to authenticated;

commit;
