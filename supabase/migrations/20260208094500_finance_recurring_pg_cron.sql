-- File: supabase/migrations/20260208094500_finance_recurring_pg_cron.sql
-- B28: Optional automatic recurring runner via pg_cron (database-side)
-- - Adds system runner functions that DO NOT depend on auth.uid()/auth.role()
-- - Adds a small log table
-- - Tries to enable pg_cron and schedule a daily job (guarded; no-op if pg_cron unavailable)
-- Idempotent: create-if-not-exists tables, CREATE OR REPLACE functions, guarded cron scheduling

begin;

-- ------------------------------------------------------------
-- Log table
-- ------------------------------------------------------------
create table if not exists public.finance_system_job_runs (
  id bigserial primary key,
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,

  as_of date not null default current_date,

  entities_processed int not null default 0,
  created_count int not null default 0,
  skipped_count int not null default 0,
  error_count int not null default 0,

  notes text null
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_system_job_runs_job_started_idx'
  ) then
    create index finance_system_job_runs_job_started_idx
      on public.finance_system_job_runs(job_name, started_at desc);
  end if;
end $$;

-- ------------------------------------------------------------
-- SYSTEM (no-auth) recurring generator for a single entity
-- Mirrors public.finance_recurring_generate_due but WITHOUT auth checks.
-- Returns the same shape.
-- ------------------------------------------------------------
create or replace function public.finance_recurring_generate_due_system(
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
  v_as_of date := coalesce(p_as_of, current_date);

  r record;
  v_run_date date;
  v_ref text;
  v_existing uuid;
  v_fin uuid;

  v_rule_attempts int;
  v_total_attempts int := 0;
  v_rule_cap int := 50;   -- max per rule per call
  v_total_cap int := 300; -- max total per call
begin
  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
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
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by)
        values (r.id, v_run_date, 'skipped', 'End date reached', null)
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
        -- NOTE: finance_entry_upsert_manual is service_role-enabled (B27) but still checks auth.role().
        -- In db-cron context auth.role() is usually NULL, so we insert directly here.

        -- Resolve category (auto-create by name when needed)
        -- Use helper from B26: finance_category_get_or_create
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
        insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by)
        values (r.id, v_run_date, 'error', 'Failed to create finance entry', null)
        on conflict (rule_id, run_date) do update set
          status = excluded.status,
          error = excluded.error;

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

      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by)
      values (r.id, v_run_date, 'created', v_fin, null)
      on conflict (rule_id, run_date)
      do update set
        status = excluded.status,
        finance_entry_id = excluded.finance_entry_id,
        error = null;

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

revoke all on function public.finance_recurring_generate_due_system(text, uuid, date) from public;
grant execute on function public.finance_recurring_generate_due_system(text, uuid, date) to service_role;

-- ------------------------------------------------------------
-- SYSTEM runner across all due entities (for pg_cron)
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

    for r in
      select * from public.finance_recurring_generate_due_system(e.entity_type, e.entity_id, v_as_of)
    loop
      if r.status = 'created' then
        v_created := v_created + 1;
      elsif r.status = 'error' then
        v_error := v_error + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    end loop;
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

-- ------------------------------------------------------------
-- Optional: schedule with pg_cron (guarded)
-- NOTE: If pg_cron isn't available in your Supabase project, this is a no-op.
-- Job: daily at 02:00 (server time)
-- ------------------------------------------------------------
do $$
declare
  v_has_cron boolean := false;
  v_jobname text := 'finance_recurring_daily';
  v_schedule text := '0 2 * * *';
  v_command text := $$select public.finance_recurring_cron_run(current_date, 500);$$;
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    -- extension not allowed; ignore
    null;
  end;

  select exists(select 1 from pg_extension where extname = 'pg_cron') into v_has_cron;
  if not v_has_cron then
    return;
  end if;

  -- If job already exists, unschedule then re-schedule to ensure settings match
  if exists(select 1 from cron.job where jobname = v_jobname) then
    perform cron.unschedule((select jobid from cron.job where jobname = v_jobname limit 1));
  end if;

  perform cron.schedule(v_jobname, v_schedule, v_command);
end $$;

commit;
