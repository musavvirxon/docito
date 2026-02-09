-- File: supabase/migrations/20260208110000_finance_recurring_export_runs.sql
-- B33: Export recurring rule runs (per entity) for analytics/auditing
-- - Adds RPC: finance_recurring_runs_export(entity_type, entity_id, date_from, date_to, limit)
-- - Joins: recurring_rule_runs + recurring_rules + finance_entries
-- - Auth + can_access_entity enforced
-- Idempotent: CREATE OR REPLACE

begin;

create or replace function public.finance_recurring_runs_export(
  p_entity_type text,
  p_entity_id uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 5000
)
returns table (
  run_date date,
  status text,
  rule_id uuid,
  entry_type text,
  amount_cents bigint,
  currency text,
  category_name text,
  rule_description text,
  finance_entry_id uuid,
  entry_occurred_at timestamptz,
  entry_description text,
  entry_reference text,
  run_error text,
  run_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from date := p_date_from;
  v_to date := p_date_to;
  v_lim int := greatest(least(coalesce(p_limit, 5000), 20000), 1);
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

  -- Default range: last 30 days if none provided
  if v_from is null and v_to is null then
    v_to := current_date;
    v_from := current_date - 30;
  elsif v_from is null and v_to is not null then
    v_from := v_to - 30;
  elsif v_from is not null and v_to is null then
    v_to := v_from + 30;
  end if;

  if v_from > v_to then
    raise exception 'date_from must be <= date_to';
  end if;

  return query
  select
    rrn.run_date,
    rrn.status,
    rrn.rule_id,
    r.entry_type,
    r.amount_cents,
    r.currency,
    r.category_name,
    r.description as rule_description,
    rrn.finance_entry_id,
    e.occurred_at as entry_occurred_at,
    e.description as entry_description,
    e.reference as entry_reference,
    rrn.error as run_error,
    rrn.created_at as run_created_at
  from public.finance_recurring_rule_runs rrn
  join public.finance_recurring_rules r
    on r.id = rrn.rule_id
  left join public.finance_entries e
    on e.id = rrn.finance_entry_id
  where r.entity_type = p_entity_type
    and r.entity_id = p_entity_id
    and rrn.run_date between v_from and v_to
  order by rrn.run_date desc, rrn.created_at desc
  limit v_lim;

end;
$$;

revoke all on function public.finance_recurring_runs_export(text, uuid, date, date, int) from public;
grant execute on function public.finance_recurring_runs_export(text, uuid, date, date, int) to authenticated;

commit;
