
-- Fix: drop old function with mismatched return type, then recreate
drop function if exists public.finance_recurring_entity_runs_list(text, uuid, integer);

create or replace function public.finance_recurring_entity_runs_list(
  p_entity_type text, p_entity_id uuid, p_limit int default 30
)
returns table (id uuid, source text, as_of date, started_at timestamptz, finished_at timestamptz, created_count int, skipped_count int, error_count int, notes text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := greatest(least(coalesce(p_limit, 30), 200), 1);
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.can_access_entity(p_entity_type, p_entity_id) then raise exception 'Forbidden'; end if;
  return query
  select r.id, r.source, r.as_of, r.started_at, r.finished_at, r.created_count, r.skipped_count, r.error_count, r.notes
  from public.finance_recurring_entity_runs r
  where r.entity_type = p_entity_type and r.entity_id = p_entity_id
  order by r.started_at desc limit v_lim;
end;
$$;

revoke all on function public.finance_recurring_entity_runs_list(text, uuid, int) from public;
grant execute on function public.finance_recurring_entity_runs_list(text, uuid, int) to authenticated;

notify pgrst, 'reload schema';
