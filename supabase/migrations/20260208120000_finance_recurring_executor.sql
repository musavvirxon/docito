-- File: supabase/migrations/20260208120000_finance_recurring_executor.sql
-- B37: Recurring finance executor (DB RPC) + minimal schema hardening + idempotent constraints
-- - Adds/ensures: finance_entries, finance_recurring_rules (minimal columns used by UI)
-- - Adds RPCs:
--    1) finance_apply_recurring_rules(...)             -> for authenticated users (checks auth.uid + can_access_entity)
--    2) finance_apply_recurring_rules_service(...)     -> for trusted cron/service execution (service_role only)
-- - Adds unique index to prevent duplicate recurring inserts per rule+date

begin;

-- ============= TABLES (IDEMPOTENT) =============

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  occurred_at timestamptz not null default now(),
  entry_type text not null, -- 'income' | 'expense' | 'payroll'
  amount_cents bigint not null,
  currency text not null default 'USD',
  category_id uuid null,
  description text null,
  reference text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_recurring_rules (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  name text not null,
  entry_type text not null, -- 'income' | 'expense' | 'payroll'
  amount_cents bigint not null,
  currency text not null default 'USD',
  frequency text not null, -- 'daily' | 'weekly' | 'monthly'
  is_active boolean not null default true,
  last_run_at timestamptz null,
  next_run_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist (in case tables were created earlier without them)
alter table public.finance_entries
  add column if not exists reference text null;

alter table public.finance_entries
  add column if not exists description text null;

alter table public.finance_recurring_rules
  add column if not exists last_run_at timestamptz null;

alter table public.finance_recurring_rules
  add column if not exists next_run_at date null;

-- Minimal sanity constraints (idempotent via "if not exists" pattern for indexes)
create index if not exists finance_entries_entity_idx
  on public.finance_entries (entity_type, entity_id, occurred_at desc);

create index if not exists finance_recurring_rules_entity_idx
  on public.finance_recurring_rules (entity_type, entity_id, is_active, next_run_at);

-- Prevent duplicates for recurring entries:
-- reference format: recurring_rule:<rule_id>:<YYYY-MM-DD>
create unique index if not exists finance_entries_unique_reference_per_entity
  on public.finance_entries (entity_type, entity_id, reference)
  where reference is not null;

-- Backfill next_run_at for existing rules if missing
update public.finance_recurring_rules
set next_run_at = coalesce(next_run_at, (created_at at time zone 'utc')::date)
where next_run_at is null;

-- ============= HELPERS =============

create or replace function public._finance_next_date(p_freq text, p_date date)
returns date
language sql
immutable
as $$
  select
    case
      when p_freq = 'daily' then (p_date + 1)
      when p_freq = 'weekly' then (p_date + 7)
      when p_freq = 'monthly' then ((p_date + interval '1 month')::date)
      else (p_date + 1)
    end;
$$;

-- ============= AUTHENTICATED APPLY RPC =============

create or replace function public.finance_apply_recurring_rules(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default null,
  p_dry_run boolean default false,
  p_max_iterations int default 120
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_as_of date := coalesce(p_as_of, current_date);
  v_iter_limit int := greatest(least(coalesce(p_max_iterations, 120), 3650), 1);

  v_inserted int := 0;
  v_updated int := 0;

  r record;
  v_next date;
  v_loop int;
  v_ref text;
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

  -- Access check (must exist in your DB; used consistently across finance RPCs)
  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  for r in
    select *
    from public.finance_recurring_rules
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and is_active = true
      and coalesce(next_run_at, v_as_of) <= v_as_of
    order by coalesce(next_run_at, v_as_of) asc, created_at asc
  loop
    v_next := coalesce(r.next_run_at, (r.created_at at time zone 'utc')::date);
    v_loop := 0;

    -- catch up in case multiple missed periods
    while v_next <= v_as_of loop
      v_loop := v_loop + 1;
      exit when v_loop > v_iter_limit;

      v_ref := 'recurring_rule:' || r.id::text || ':' || to_char(v_next, 'YYYY-MM-DD');

      if p_dry_run then
        v_inserted := v_inserted + 1;
      else
        insert into public.finance_entries (
          entity_type,
          entity_id,
          occurred_at,
          entry_type,
          amount_cents,
          currency,
          category_id,
          description,
          reference
        )
        values (
          r.entity_type,
          r.entity_id,
          (v_next::timestamptz + interval '12 hours'), -- midday UTC to reduce timezone edge issues
          r.entry_type,
          r.amount_cents,
          r.currency,
          null,
          r.name,
          v_ref
        )
        on conflict (entity_type, entity_id, reference) do nothing;

        -- Count only if inserted
        get diagnostics v_loop = row_count;
        if v_loop = 1 then
          v_inserted := v_inserted + 1;
        end if;
      end if;

      v_next := public._finance_next_date(r.frequency, v_next);
    end loop;

    if not p_dry_run then
      update public.finance_recurring_rules
      set
        last_run_at = now(),
        next_run_at = v_next,
        updated_at = now()
      where id = r.id;

      v_updated := v_updated + 1;
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'as_of', v_as_of,
    'dry_run', p_dry_run,
    'inserted', v_inserted,
    'updated_rules', v_updated
  );
end;
$$;

revoke all on function public.finance_apply_recurring_rules(text, uuid, date, boolean, int) from public;
grant execute on function public.finance_apply_recurring_rules(text, uuid, date, boolean, int) to authenticated;

-- ============= SERVICE APPLY RPC (CRON) =============

create or replace function public.finance_apply_recurring_rules_service(
  p_entity_type text,
  p_entity_id uuid,
  p_as_of date default null,
  p_dry_run boolean default false,
  p_max_iterations int default 120
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_as_of date := coalesce(p_as_of, current_date);
  v_iter_limit int := greatest(least(coalesce(p_max_iterations, 120), 3650), 1);

  v_inserted int := 0;
  v_updated int := 0;

  r record;
  v_next date;
  v_loop int;
  v_ref text;
begin
  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  for r in
    select *
    from public.finance_recurring_rules
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and is_active = true
      and coalesce(next_run_at, v_as_of) <= v_as_of
    order by coalesce(next_run_at, v_as_of) asc, created_at asc
  loop
    v_next := coalesce(r.next_run_at, (r.created_at at time zone 'utc')::date);
    v_loop := 0;

    while v_next <= v_as_of loop
      v_loop := v_loop + 1;
      exit when v_loop > v_iter_limit;

      v_ref := 'recurring_rule:' || r.id::text || ':' || to_char(v_next, 'YYYY-MM-DD');

      if p_dry_run then
        v_inserted := v_inserted + 1;
      else
        insert into public.finance_entries (
          entity_type,
          entity_id,
          occurred_at,
          entry_type,
          amount_cents,
          currency,
          category_id,
          description,
          reference
        )
        values (
          r.entity_type,
          r.entity_id,
          (v_next::timestamptz + interval '12 hours'),
          r.entry_type,
          r.amount_cents,
          r.currency,
          null,
          r.name,
          v_ref
        )
        on conflict (entity_type, entity_id, reference) do nothing;

        get diagnostics v_loop = row_count;
        if v_loop = 1 then
          v_inserted := v_inserted + 1;
        end if;
      end if;

      v_next := public._finance_next_date(r.frequency, v_next);
    end loop;

    if not p_dry_run then
      update public.finance_recurring_rules
      set
        last_run_at = now(),
        next_run_at = v_next,
        updated_at = now()
      where id = r.id;

      v_updated := v_updated + 1;
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'as_of', v_as_of,
    'dry_run', p_dry_run,
    'inserted', v_inserted,
    'updated_rules', v_updated
  );
end;
$$;

revoke all on function public.finance_apply_recurring_rules_service(text, uuid, date, boolean, int) from public;
-- IMPORTANT: only service_role can execute this.
grant execute on function public.finance_apply_recurring_rules_service(text, uuid, date, boolean, int) to service_role;

commit;
