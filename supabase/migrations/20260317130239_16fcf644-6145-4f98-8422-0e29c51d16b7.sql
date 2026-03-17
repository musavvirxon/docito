
-- Drop conflicting functions first, then recreate
drop function if exists public.finance_recurring_rule_list(text, uuid);
drop function if exists public.finance_recurring_entity_status(text, uuid);

create or replace function public.finance_recurring_entity_status(p_entity_type text, p_entity_id uuid, p_as_of date default current_date)
returns jsonb language plpgsql security definer set search_path = public
as $$ declare v_uid uuid := auth.uid(); v_as_of date := coalesce(p_as_of, current_date); v_total int; v_active int; v_due int; v_last timestamptz;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.can_access_entity(p_entity_type, p_entity_id) then raise exception 'Forbidden'; end if;
  select count(*), count(*) filter (where active), count(*) filter (where active and next_run_date <= v_as_of) into v_total, v_active, v_due from public.finance_recurring_rules where entity_type = p_entity_type and entity_id = p_entity_id;
  select max(er.started_at) into v_last from public.finance_recurring_entity_runs er where er.entity_type = p_entity_type and er.entity_id = p_entity_id;
  return jsonb_build_object('total_rules', coalesce(v_total,0), 'active_rules', coalesce(v_active,0), 'due_rules', coalesce(v_due,0), 'last_run_at', v_last);
end; $$;
revoke all on function public.finance_recurring_entity_status(text, uuid, date) from public;
grant execute on function public.finance_recurring_entity_status(text, uuid, date) to authenticated;

create or replace function public.finance_recurring_rule_list(p_entity_type text, p_entity_id uuid)
returns table (id uuid, entry_type text, category_id uuid, category_name text, amount_cents bigint, currency text, description text, schedule text, interval_n int, day_of_week int, day_of_month int, start_date date, end_date date, next_run_date date, active boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$ declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.can_access_entity(p_entity_type, p_entity_id) then raise exception 'Forbidden'; end if;
  return query select r.id, r.entry_type, r.category_id, coalesce(fc.name, r.category_name, 'Uncategorized')::text, r.amount_cents, r.currency, r.description, r.schedule, r.interval_n, r.day_of_week, r.day_of_month, r.start_date, r.end_date, r.next_run_date, r.active, r.updated_at
  from public.finance_recurring_rules r left join public.finance_categories fc on fc.id = r.category_id and fc.entity_type = r.entity_type and fc.entity_id = r.entity_id
  where r.entity_type = p_entity_type and r.entity_id = p_entity_id order by r.active desc, r.next_run_date asc;
end; $$;
revoke all on function public.finance_recurring_rule_list(text, uuid) from public;
grant execute on function public.finance_recurring_rule_list(text, uuid) to authenticated;

notify pgrst, 'reload schema';
