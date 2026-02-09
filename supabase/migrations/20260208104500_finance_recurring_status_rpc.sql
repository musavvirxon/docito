-- File: supabase/migrations/20260208104500_finance_recurring_status_rpc.sql
-- B32: Recurring automation status RPC (per entity)
-- - Adds RPC finance_recurring_entity_status(entity_type, entity_id, as_of)
-- - Lets UI show: due rules count, next due date, last automation run summary
-- Idempotent (CREATE OR REPLACE)

begin;

create or replace function public.finance_recurring_entity_status(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default current_date
)
returns table (
  due_rules_count int,
  next_due_date date,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  last_run_source text,
  last_created_count int,
  last_skipped_count int,
  last_error_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_as_of date := coalesce(p_as_of, current_date);
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

  -- due rules
  select
    count(*)::int,
    min(rr.next_run_date)
  into
    due_rules_count,
    next_due_date
  from public.finance_recurring_rules rr
  where rr.entity_type = p_entity_type
    and rr.entity_id = p_entity_id
    and rr.active = true
    and rr.next_run_date <= v_as_of;

  -- last automation run
  select
    er.started_at,
    er.finished_at,
    er.source,
    er.created_count,
    er.skipped_count,
    er.error_count
  into
    last_run_started_at,
    last_run_finished_at,
    last_run_source,
    last_created_count,
    last_skipped_count,
    last_error_count
  from public.finance_recurring_entity_runs er
  where er.entity_type = p_entity_type
    and er.entity_id = p_entity_id
  order by er.started_at desc
  limit 1;

  return;
end;
$$;

revoke all on function public.finance_recurring_entity_status(text, uuid, date) from public;
grant execute on function public.finance_recurring_entity_status(text, uuid, date) to authenticated;

commit;
