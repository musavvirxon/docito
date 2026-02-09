-- File: supabase/migrations/20260207220000_finance_recurring_batch_and_runs.sql
-- B25: Improve recurring generation (catch-up batch) + list rule runs
-- - CREATE OR REPLACE finance_recurring_generate_due to catch up multiple periods per rule (with safety cap)
-- - Add RPC finance_recurring_rule_runs_list
-- Idempotent

begin;

-- -----------------------------
-- RPC: list runs for an entity (recent first)
-- -----------------------------
create or replace function public.finance_recurring_rule_runs_list(
  p_entity_type text,
  p_entity_id uuid,
  p_limit int default 100
)
returns table (
  run_id uuid,
  rule_id uuid,
  run_date date,
  status text,
  finance_entry_id uuid,
  error text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := greatest(least(coalesce(p_limit, 100), 500), 1);
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
    rrn.id as run_id,
    rrn.rule_id,
    rrn.run_date,
    rrn.status,
    rrn.finance_entry_id,
    rrn.error,
    rrn.created_at
  from public.finance_recurring_rule_runs rrn
  join public.finance_recurring_rules r
    on r.id = rrn.rule_id
   and r.entity_type = p_entity_type
   and r.entity_id = p_entity_id
  order by rrn.run_date desc, rrn.created_at desc
  limit v_lim;
end;
$$;

revoke all on function public.finance_recurring_rule_runs_list(text, uuid, int) from public;
grant execute on function public.finance_recurring_rule_runs_list(text, uuid, int) to authenticated;

-- -----------------------------
-- REPLACE: finance_recurring_generate_due (catch-up batch)
-- - For each active rule with next_run_date <= as_of:
--   generate entries repeatedly until next_run_date > as_of OR end_date exceeded OR safety cap hit.
-- - Returns rows for created/skipped/error for each attempted run_date.
-- -----------------------------
create or replace function public.finance_recurring_generate_due(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default current_date
)
returns table (
  rule_id uuid,
  run_date date,
  status text,
  finance_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_as_of date := coalesce(p_as_of, current_date);

  r record;
  v_run_date date;
  v_ref text;
  v_existing uuid;
  v_fin uuid;
  v_cat_id uuid;

  v_rule_attempts int;
  v_total_attempts int := 0;
  v_rule_cap int := 50;   -- max per rule per call
  v_total_cap int := 300; -- max total per call
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

  for r in
    select *
    from public.finance_recurring_rules rr
    where rr.entity_type = p_entity_type
      and rr.entity_id = p_entity_id
      and rr.active = true
      and rr.next_run_date <= v_as_of
      and rr.start_date <= v_as_of
      and (rr.end_date is null or rr.end_date >= rr.next_run_date)
    order by rr.next_run_date asc
  loop
    v_rule_attempts := 0;

    -- Catch up this rule while due
    while r.next_run_date <= v_as_of loop
      exit when v_rule_attempts >= v_rule_cap;
      exit when v_total_attempts >= v_total_cap;

      v_run_date := r.next_run_date;

      -- If end_date reached, mark skipped and deactivate further by pushing next_run_date forward once
      if r.end_date is not null and v_run_date > r.end_date then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by)
        values (r.id, v_run_date, 'skipped', 'End date reached', v_uid)
        on conflict (rule_id, run_date) do nothing;

        return query select r.id, v_run_date, 'skipped', null::uuid;

        -- advance once to avoid infinite loops
        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = v_uid
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

      v_ref := 'recurring:' || r.id::text || ':' || v_run_date::text;

      -- Already logged as created?
      select fr.finance_entry_id
        into v_existing
      from public.finance_recurring_rule_runs fr
      where fr.rule_id = r.id
        and fr.run_date = v_run_date
        and fr.status = 'created'
      limit 1;

      if v_existing is not null then
        return query select r.id, v_run_date, 'skipped', v_existing;

        -- advance and continue
        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = v_uid
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

      -- if a finance entry already exists with reference, treat as created
      v_fin := null;
      begin
        select e.id
          into v_fin
        from public.finance_entries e
        where e.entity_type = p_entity_type
          and e.entity_id = p_entity_id
          and e.reference = v_ref
        limit 1;
      exception when others then
        v_fin := null;
      end;

      if v_fin is null then
        v_cat_id := r.category_id;

        select (x.entry_id)::uuid into v_fin
        from public.finance_entry_upsert_manual(
          p_entity_type := p_entity_type,
          p_entity_id := p_entity_id,

          p_entry_id := null,
          p_entry_type := r.entry_type,
          p_amount_cents := r.amount_cents,
          p_currency := r.currency,
          p_occurred_at := (v_run_date::timestamptz + interval '12 hours'),

          p_category_id := v_cat_id,
          p_category_name := r.category_name,

          p_description := coalesce(r.description, 'Recurring ' || r.entry_type),
          p_reference := v_ref
        ) as x;
      end if;

      if v_fin is null then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by)
        values (r.id, v_run_date, 'error', 'Failed to create finance entry', v_uid)
        on conflict (rule_id, run_date) do update set
          status = excluded.status,
          error = excluded.error;

        return query select r.id, v_run_date, 'error', null::uuid;

        -- advance to prevent stuck
        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = v_uid
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by)
      values (r.id, v_run_date, 'created', v_fin, v_uid)
      on conflict (rule_id, run_date)
      do update set
        status = excluded.status,
        finance_entry_id = excluded.finance_entry_id,
        error = null;

      return query select r.id, v_run_date, 'created', v_fin;

      -- advance next_run_date
      update public.finance_recurring_rules
      set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
          updated_at = now(),
          updated_by = v_uid
      where id = r.id
      returning * into r;

      v_rule_attempts := v_rule_attempts + 1;
      v_total_attempts := v_total_attempts + 1;
    end loop;
  end loop;

  return;
end;
$$;

revoke all on function public.finance_recurring_generate_due(text, uuid, date) from public;
grant execute on function public.finance_recurring_generate_due(text, uuid, date) to authenticated;

commit;
