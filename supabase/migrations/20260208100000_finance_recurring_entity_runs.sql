-- File: supabase/migrations/20260208100000_finance_recurring_entity_runs.sql
-- B29: Entity-scoped automation run logs + status RPC
-- - Adds finance_recurring_entity_runs table
-- - Adds RPC finance_recurring_entity_runs_list
-- - Replaces finance_recurring_cron_run to log per-entity
-- Idempotent

begin;

-- ------------------------------------------------------------
-- Entity-scoped run logs
-- ------------------------------------------------------------
create table if not exists public.finance_recurring_entity_runs (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  source text not null check (source in ('pg_cron','edge_cron','manual')),

  as_of date not null default current_date,

  started_at timestamptz not null default now(),
  finished_at timestamptz null,

  created_count int not null default 0,
  skipped_count int not null default 0,
  error_count int not null default 0,

  notes text null,

  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_entity_runs_entity_started_idx'
  ) then
    create index finance_recurring_entity_runs_entity_started_idx
      on public.finance_recurring_entity_runs(entity_type, entity_id, started_at desc);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_entity_runs_entity_asof_idx'
  ) then
    create index finance_recurring_entity_runs_entity_asof_idx
      on public.finance_recurring_entity_runs(entity_type, entity_id, as_of desc);
  end if;
end $$;

alter table public.finance_recurring_entity_runs enable row level security;

drop policy if exists "finance_recurring_entity_runs_select" on public.finance_recurring_entity_runs;
drop policy if exists "finance_recurring_entity_runs_insert" on public.finance_recurring_entity_runs;

create policy "finance_recurring_entity_runs_select"
on public.finance_recurring_entity_runs
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

create policy "finance_recurring_entity_runs_insert"
on public.finance_recurring_entity_runs
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

-- ------------------------------------------------------------
-- RPC: list entity runs
-- ------------------------------------------------------------
create or replace function public.finance_recurring_entity_runs_list(
  p_entity_type text,
  p_entity_id uuid,
  p_limit int default 30
)
returns table (
  id uuid,
  source text,
  as_of date,
  started_at timestamptz,
  finished_at timestamptz,
  created_count int,
  skipped_count int,
  error_count int,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := greatest(least(coalesce(p_limit, 30), 200), 1);
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
    r.id,
    r.source,
    r.as_of,
    r.started_at,
    r.finished_at,
    r.created_count,
    r.skipped_count,
    r.error_count,
    r.notes
  from public.finance_recurring_entity_runs r
  where r.entity_type = p_entity_type
    and r.entity_id = p_entity_id
  order by r.started_at desc
  limit v_lim;
end;
$$;

revoke all on function public.finance_recurring_entity_runs_list(text, uuid, int) from public;
grant execute on function public.finance_recurring_entity_runs_list(text, uuid, int) to authenticated;

-- ------------------------------------------------------------
-- Replace: cron runner to log per entity runs
-- (keeps finance_system_job_runs for overall job tracing)
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
      select * from public.finance_recurring_generate_due_system(e.entity_type, e.entity_id, v_as_of)
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
