-- File: supabase/migrations/20260208101500_finance_recurring_run_linking.sql
-- B30: Link recurring rule_runs to entity_run logs (drilldown + auditing)
-- - Adds finance_recurring_rule_runs.entity_run_id -> finance_recurring_entity_runs.id
-- - Adds RPC finance_recurring_rule_runs_for_entity_run
-- - Adds new generator functions:
--    * finance_recurring_generate_due_v2 (auth/service_role) accepts entity_run_id
--    * finance_recurring_generate_due_system_v2 (no-auth) accepts entity_run_id
-- - Replaces finance_recurring_cron_run to pass entity_run_id into system generator
-- Idempotent (guards for column/index existence; CREATE OR REPLACE functions)

begin;

-- ------------------------------------------------------------
-- Add entity_run_id to rule_runs for drilldown
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='finance_recurring_rule_runs') then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='finance_recurring_rule_runs'
        and column_name='entity_run_id'
    ) then
      alter table public.finance_recurring_rule_runs
        add column entity_run_id uuid null references public.finance_recurring_entity_runs(id) on delete set null;
    end if;

    if not exists (
      select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rule_runs_entity_run_idx'
    ) then
      create index finance_recurring_rule_runs_entity_run_idx
        on public.finance_recurring_rule_runs(entity_run_id, created_at desc);
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- RPC: list rule runs for a given entity_run_id (drilldown)
-- ------------------------------------------------------------
create or replace function public.finance_recurring_rule_runs_for_entity_run(
  p_entity_run_id uuid,
  p_limit int default 200
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
  v_lim int := greatest(least(coalesce(p_limit, 200), 1000), 1);
  v_et text;
  v_eid uuid;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_run_id is null then
    raise exception 'entity_run_id required';
  end if;

  select r.entity_type, r.entity_id
    into v_et, v_eid
  from public.finance_recurring_entity_runs r
  where r.id = p_entity_run_id
  limit 1;

  if v_et is null or v_eid is null then
    raise exception 'Entity run not found';
  end if;

  if not public.can_access_entity(v_et, v_eid) then
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
  where rrn.entity_run_id = p_entity_run_id
  order by rrn.run_date desc, rrn.created_at desc
  limit v_lim;
end;
$$;

revoke all on function public.finance_recurring_rule_runs_for_entity_run(uuid, int) from public;
grant execute on function public.finance_recurring_rule_runs_for_entity_run(uuid, int) to authenticated;

-- ------------------------------------------------------------
-- NEW: Auth/service_role generator v2 (accepts entity_run_id)
-- ------------------------------------------------------------
create or replace function public.finance_recurring_generate_due_v2(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default current_date,
  p_entity_run_id uuid default null
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
  v_role text := auth.role();
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
  if v_uid is null and v_role <> 'service_role' then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if v_role <> 'service_role' then
    if not public.can_access_entity(p_entity_type, p_entity_id) then
      raise exception 'Forbidden';
    end if;
  end if;

  -- Validate entity_run_id belongs to entity when provided
  if p_entity_run_id is not null then
    if not exists (
      select 1
      from public.finance_recurring_entity_runs er
      where er.id = p_entity_run_id
        and er.entity_type = p_entity_type
        and er.entity_id = p_entity_id
    ) then
      raise exception 'Invalid entity_run_id for entity';
    end if;
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

    while r.next_run_date <= v_as_of loop
      exit when v_rule_attempts >= v_rule_cap;
      exit when v_total_attempts >= v_total_cap;

      v_run_date := r.next_run_date;

      if r.end_date is not null and v_run_date > r.end_date then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id)
        values (r.id, v_run_date, 'skipped', 'End date reached', v_uid, p_entity_run_id)
        on conflict (rule_id, run_date) do nothing;

        return query select r.id, v_run_date, 'skipped', null::uuid;

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

      select fr.finance_entry_id
        into v_existing
      from public.finance_recurring_rule_runs fr
      where fr.rule_id = r.id
        and fr.run_date = v_run_date
        and fr.status = 'created'
      limit 1;

      if v_existing is not null then
        -- Ensure a linking row exists for this entity_run_id when provided
        if p_entity_run_id is not null then
          insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id)
          values (r.id, v_run_date, 'skipped', v_existing, v_uid, p_entity_run_id)
          on conflict (rule_id, run_date) do update set
            entity_run_id = coalesce(public.finance_recurring_rule_runs.entity_run_id, excluded.entity_run_id);
        end if;

        return query select r.id, v_run_date, 'skipped', v_existing;

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
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id)
        values (r.id, v_run_date, 'error', 'Failed to create finance entry', v_uid, p_entity_run_id)
        on conflict (rule_id, run_date) do update set
          status = excluded.status,
          error = excluded.error,
          entity_run_id = excluded.entity_run_id;

        return query select r.id, v_run_date, 'error', null::uuid;

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

      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id)
      values (r.id, v_run_date, 'created', v_fin, v_uid, p_entity_run_id)
      on conflict (rule_id, run_date)
      do update set
        status = excluded.status,
        finance_entry_id = excluded.finance_entry_id,
        error = null,
        entity_run_id = excluded.entity_run_id;

      return query select r.id, v_run_date, 'created', v_fin;

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

revoke all on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) from public;
grant execute on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) to authenticated;
grant execute on function public.finance_recurring_generate_due_v2(text, uuid, date, uuid) to service_role;

-- ------------------------------------------------------------
-- NEW: System generator v2 (no-auth) accepts entity_run_id
-- ------------------------------------------------------------
create or replace function public.finance_recurring_generate_due_system_v2(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default current_date,
  p_entity_run_id uuid default null
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
  v_as_of date := coalesce(p_as_of, current_date);

  r record;
  v_run_date date;
  v_ref text;
  v_existing uuid;
  v_fin uuid;

  v_rule_attempts int;
  v_total_attempts int := 0;
  v_rule_cap int := 50;
  v_total_cap int := 300;
begin
  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if p_entity_run_id is not null then
    if not exists (
      select 1
      from public.finance_recurring_entity_runs er
      where er.id = p_entity_run_id
        and er.entity_type = p_entity_type
        and er.entity_id = p_entity_id
    ) then
      raise exception 'Invalid entity_run_id for entity';
    end if;
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

    while r.next_run_date <= v_as_of loop
      exit when v_rule_attempts >= v_rule_cap;
      exit when v_total_attempts >= v_total_cap;

      v_run_date := r.next_run_date;

      if r.end_date is not null and v_run_date > r.end_date then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id)
        values (r.id, v_run_date, 'skipped', 'End date reached', null, p_entity_run_id)
        on conflict (rule_id, run_date) do nothing;

        return query select r.id, v_run_date, 'skipped', null::uuid;

        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = null
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

      v_ref := 'recurring:' || r.id::text || ':' || v_run_date::text;

      select fr.finance_entry_id
        into v_existing
      from public.finance_recurring_rule_runs fr
      where fr.rule_id = r.id
        and fr.run_date = v_run_date
        and fr.status = 'created'
      limit 1;

      if v_existing is not null then
        if p_entity_run_id is not null then
          insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id)
          values (r.id, v_run_date, 'skipped', v_existing, null, p_entity_run_id)
          on conflict (rule_id, run_date) do update set
            entity_run_id = coalesce(public.finance_recurring_rule_runs.entity_run_id, excluded.entity_run_id);
        end if;

        return query select r.id, v_run_date, 'skipped', v_existing;

        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = null
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

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
        insert into public.finance_entries(
          entity_type, entity_id,
          entry_type, amount_cents, currency,
          occurred_at,
          category_id,
          description, reference,
          created_by, updated_by
        )
        values (
          p_entity_type, p_entity_id,
          r.entry_type, r.amount_cents, r.currency,
          (v_run_date::timestamptz + interval '12 hours'),
          public.finance_category_get_or_create(
            p_entity_type,
            p_entity_id,
            r.entry_type,
            r.category_id,
            r.category_name
          ),
          coalesce(r.description, 'Recurring ' || r.entry_type),
          v_ref,
          null,
          null
        )
        returning id into v_fin;
      end if;

      if v_fin is null then
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by, entity_run_id)
        values (r.id, v_run_date, 'error', 'Failed to create finance entry', null, p_entity_run_id)
        on conflict (rule_id, run_date) do update set
          status = excluded.status,
          error = excluded.error,
          entity_run_id = excluded.entity_run_id;

        return query select r.id, v_run_date, 'error', null::uuid;

        update public.finance_recurring_rules
        set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
            updated_at = now(),
            updated_by = null
        where id = r.id
        returning * into r;

        v_rule_attempts := v_rule_attempts + 1;
        v_total_attempts := v_total_attempts + 1;
        continue;
      end if;

      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by, entity_run_id)
      values (r.id, v_run_date, 'created', v_fin, null, p_entity_run_id)
      on conflict (rule_id, run_date)
      do update set
        status = excluded.status,
        finance_entry_id = excluded.finance_entry_id,
        error = null,
        entity_run_id = excluded.entity_run_id;

      return query select r.id, v_run_date, 'created', v_fin;

      update public.finance_recurring_rules
      set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
          updated_at = now(),
          updated_by = null
      where id = r.id
      returning * into r;

      v_rule_attempts := v_rule_attempts + 1;
      v_total_attempts := v_total_attempts + 1;
    end loop;
  end loop;

  return;
end;
$$;

revoke all on function public.finance_recurring_generate_due_system_v2(text, uuid, date, uuid) from public;
grant execute on function public.finance_recurring_generate_due_system_v2(text, uuid, date, uuid) to service_role;

-- ------------------------------------------------------------
-- Replace: cron runner to call system_v2 and pass entity_run_id
-- ------------------------------------------------------------
create or replace function public.finance_recurring_cron_run(
  p_as_of date default current_date,
  p_max_entities int default 200
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_as_of date := coalesce(p_as_of, current_date);
  v_max int := greatest(least(coalesce(p_max_entities, 200), 2000), 1);

  v_job_id bigint;
  v_entities_processed int := 0;
  v_created int := 0;
  v_skipped int := 0;
  v_error int := 0;

  e record;
  r record;

  v_entity_run_id uuid;
  v_ec int;
  v_es int;
  v_ee int;
begin
  insert into public.finance_system_job_runs(job_name, as_of)
  values ('finance_recurring_daily', v_as_of)
  returning id into v_job_id;

  for e in
    select distinct rr.entity_type, rr.entity_id
    from public.finance_recurring_rules rr
    where rr.active = true
      and rr.next_run_date <= v_as_of
    order by rr.entity_type, rr.entity_id
    limit v_max
  loop
    v_entities_processed := v_entities_processed + 1;

    v_ec := 0; v_es := 0; v_ee := 0;

    insert into public.finance_recurring_entity_runs(
      entity_type, entity_id, source, as_of, started_at
    )
    values (
      e.entity_type, e.entity_id, 'pg_cron', v_as_of, now()
    )
    returning id into v_entity_run_id;

    for r in
      select * from public.finance_recurring_generate_due_system_v2(e.entity_type, e.entity_id, v_as_of, v_entity_run_id)
    loop
      if r.status = 'created' then
        v_ec := v_ec + 1;
      elsif r.status = 'error' then
        v_ee := v_ee + 1;
      else
        v_es := v_es + 1;
      end if;
    end loop;

    update public.finance_recurring_entity_runs
    set finished_at = now(),
        created_count = v_ec,
        skipped_count = v_es,
        error_count = v_ee
    where id = v_entity_run_id;

    v_created := v_created + v_ec;
    v_skipped := v_skipped + v_es;
    v_error := v_error + v_ee;
  end loop;

  update public.finance_system_job_runs
  set finished_at = now(),
      entities_processed = v_entities_processed,
      created_count = v_created,
      skipped_count = v_skipped,
      error_count = v_error
  where id = v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.finance_recurring_cron_run(date, int) from public;
grant execute on function public.finance_recurring_cron_run(date, int) to service_role;

commit;
