-- File: supabase/migrations/20260207214000_finance_recurring_rules.sql
-- B24: Recurring finance rules (utilities/tax/etc) + generator
-- Idempotent: create-if-not-exists, CREATE OR REPLACE functions, safe policies

begin;

-- -----------------------------
-- Tables
-- -----------------------------
create table if not exists public.finance_recurring_rules (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  entry_type text not null check (entry_type in ('income','expense','payroll')),

  category_id uuid null,
  category_name text null,

  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',

  description text null,

  schedule text not null check (schedule in ('daily','weekly','monthly')),
  interval_n int not null default 1 check (interval_n >= 1),

  -- weekly
  day_of_week int null check (day_of_week between 0 and 6),
  -- monthly (recommend 1-28 to avoid month length issues)
  day_of_month int null check (day_of_month between 1 and 28),

  start_date date not null default current_date,
  end_date date null,

  next_run_date date not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rules_entity_next_idx'
  ) then
    create index finance_recurring_rules_entity_next_idx
      on public.finance_recurring_rules(entity_type, entity_id, active, next_run_date);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rules_entity_idx'
  ) then
    create index finance_recurring_rules_entity_idx
      on public.finance_recurring_rules(entity_type, entity_id);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_finance_recurring_rules_updated_at on public.finance_recurring_rules;
    create trigger trg_finance_recurring_rules_updated_at
    before update on public.finance_recurring_rules
    for each row
    execute function public.set_updated_at();
  end if;
exception when others then
  null;
end $$;

create table if not exists public.finance_recurring_rule_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.finance_recurring_rules(id) on delete cascade,

  run_date date not null,
  status text not null check (status in ('created','skipped','error')),

  finance_entry_id uuid null,
  error text null,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rule_runs_rule_date_unique'
  ) then
    create unique index finance_recurring_rule_runs_rule_date_unique
      on public.finance_recurring_rule_runs(rule_id, run_date);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_recurring_rule_runs_rule_idx'
  ) then
    create index finance_recurring_rule_runs_rule_idx
      on public.finance_recurring_rule_runs(rule_id, created_at desc);
  end if;
end $$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.finance_recurring_rules enable row level security;
alter table public.finance_recurring_rule_runs enable row level security;

drop policy if exists "finance_recurring_rules_select" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_insert" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_update" on public.finance_recurring_rules;
drop policy if exists "finance_recurring_rules_delete" on public.finance_recurring_rules;

create policy "finance_recurring_rules_select"
on public.finance_recurring_rules
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

create policy "finance_recurring_rules_insert"
on public.finance_recurring_rules
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

create policy "finance_recurring_rules_update"
on public.finance_recurring_rules
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

create policy "finance_recurring_rules_delete"
on public.finance_recurring_rules
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_recurring_rule_runs_select" on public.finance_recurring_rule_runs;
drop policy if exists "finance_recurring_rule_runs_insert" on public.finance_recurring_rule_runs;

create policy "finance_recurring_rule_runs_select"
on public.finance_recurring_rule_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.finance_recurring_rules r
    where r.id = rule_id
      and public.can_access_entity(r.entity_type, r.entity_id)
  )
);

create policy "finance_recurring_rule_runs_insert"
on public.finance_recurring_rule_runs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.finance_recurring_rules r
    where r.id = rule_id
      and public.can_access_entity(r.entity_type, r.entity_id)
  )
);

-- -----------------------------
-- Helpers
-- -----------------------------
create or replace function public.finance_recurring_first_run_date(
  p_schedule text,
  p_start_date date,
  p_day_of_week int,
  p_day_of_month int
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sched text := nullif(btrim(coalesce(p_schedule,'')), '');
  v_start date := coalesce(p_start_date, current_date);
  v_dow int := p_day_of_week;
  v_dom int := p_day_of_month;
  v_run date;
  v_attempt int := 0;
begin
  if v_sched is null or v_sched not in ('daily','weekly','monthly') then
    raise exception 'Invalid schedule';
  end if;

  if v_sched = 'daily' then
    return v_start;
  end if;

  if v_sched = 'weekly' then
    if v_dow is null or v_dow < 0 or v_dow > 6 then
      raise exception 'day_of_week required for weekly';
    end if;

    v_run := v_start;
    -- find next date on/after start matching day_of_week
    while extract(dow from v_run)::int <> v_dow and v_attempt < 14 loop
      v_run := v_run + interval '1 day';
      v_attempt := v_attempt + 1;
    end loop;

    return v_run;
  end if;

  -- monthly
  if v_dom is null or v_dom < 1 or v_dom > 28 then
    raise exception 'day_of_month required for monthly (1-28)';
  end if;

  v_run := make_date(extract(year from v_start)::int, extract(month from v_start)::int, v_dom);

  if v_run < v_start then
    v_run := (make_date(extract(year from (v_start + interval '1 month'))::int, extract(month from (v_start + interval '1 month'))::int, v_dom));
  end if;

  return v_run;
end;
$$;

revoke all on function public.finance_recurring_first_run_date(text, date, int, int) from public;
grant execute on function public.finance_recurring_first_run_date(text, date, int, int) to authenticated;

create or replace function public.finance_recurring_next_run_date(
  p_schedule text,
  p_interval_n int,
  p_current_run date,
  p_day_of_month int
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sched text := nullif(btrim(coalesce(p_schedule,'')), '');
  v_int int := greatest(coalesce(p_interval_n, 1), 1);
  v_cur date := coalesce(p_current_run, current_date);
  v_dom int := coalesce(p_day_of_month, 1);
  v_next date;
begin
  if v_sched is null or v_sched not in ('daily','weekly','monthly') then
    raise exception 'Invalid schedule';
  end if;

  if v_sched = 'daily' then
    return v_cur + (v_int || ' days')::interval;
  end if;

  if v_sched = 'weekly' then
    return v_cur + (v_int * 7 || ' days')::interval;
  end if;

  -- monthly
  if v_dom < 1 then v_dom := 1; end if;
  if v_dom > 28 then v_dom := 28; end if;

  v_next := (v_cur + (v_int || ' months')::interval)::date;
  return make_date(extract(year from v_next)::int, extract(month from v_next)::int, v_dom);
end;
$$;

revoke all on function public.finance_recurring_next_run_date(text, int, date, int) from public;
grant execute on function public.finance_recurring_next_run_date(text, int, date, int) to authenticated;

-- -----------------------------
-- RPC: list rules
-- -----------------------------
create or replace function public.finance_recurring_rule_list(
  p_entity_type text,
  p_entity_id uuid
)
returns table (
  id uuid,
  entry_type text,
  category_id uuid,
  category_name text,
  amount_cents bigint,
  currency text,
  description text,
  schedule text,
  interval_n int,
  day_of_week int,
  day_of_month int,
  start_date date,
  end_date date,
  next_run_date date,
  active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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
    r.entry_type,
    r.category_id,
    coalesce(fc.name, r.category_name, 'Uncategorized') as category_name,
    r.amount_cents,
    r.currency,
    r.description,
    r.schedule,
    r.interval_n,
    r.day_of_week,
    r.day_of_month,
    r.start_date,
    r.end_date,
    r.next_run_date,
    r.active,
    r.updated_at
  from public.finance_recurring_rules r
  left join public.finance_categories fc
    on fc.id = r.category_id
   and fc.entity_type = r.entity_type
   and fc.entity_id = r.entity_id
  where r.entity_type = p_entity_type
    and r.entity_id = p_entity_id
  order by r.active desc, r.next_run_date asc, r.updated_at desc;
end;
$$;

revoke all on function public.finance_recurring_rule_list(text, uuid) from public;
grant execute on function public.finance_recurring_rule_list(text, uuid) to authenticated;

-- -----------------------------
-- RPC: upsert rule
-- -----------------------------
create or replace function public.finance_recurring_rule_upsert(
  p_entity_type text,
  p_entity_id uuid,
  p_rule_id uuid,
  p_entry_type text,
  p_amount_cents bigint,
  p_currency text,
  p_description text,
  p_schedule text,
  p_interval_n int,
  p_day_of_week int,
  p_day_of_month int,
  p_start_date date,
  p_end_date date,
  p_category_id uuid default null,
  p_category_name text default null,
  p_active boolean default true
)
returns table (rule_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entry text := nullif(btrim(coalesce(p_entry_type,'')), '');
  v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), ''));
  v_desc text := nullif(btrim(coalesce(p_description,'')), '');
  v_sched text := nullif(btrim(coalesce(p_schedule,'')), '');
  v_int int := greatest(coalesce(p_interval_n, 1), 1);
  v_start date := coalesce(p_start_date, current_date);
  v_end date := p_end_date;
  v_active boolean := coalesce(p_active, true);

  v_first date;
  v_existing_next date;
  v_rule_id uuid;
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

  if v_entry is null or v_entry not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'Invalid amount';
  end if;

  if v_cur is null then v_cur := 'USD'; end if;

  if v_sched is null or v_sched not in ('daily','weekly','monthly') then
    raise exception 'Invalid schedule';
  end if;

  if v_end is not null and v_end < v_start then
    raise exception 'end_date cannot be before start_date';
  end if;

  -- compute first run date based on schedule
  v_first := public.finance_recurring_first_run_date(
    v_sched,
    v_start,
    p_day_of_week,
    p_day_of_month
  );

  -- preserve next_run_date on edits when rule already exists and is active,
  -- unless start_date/schedule was moved forward beyond existing next_run_date.
  v_existing_next := null;

  if p_rule_id is not null then
    select r.next_run_date
      into v_existing_next
    from public.finance_recurring_rules r
    where r.id = p_rule_id
      and r.entity_type = p_entity_type
      and r.entity_id = p_entity_id
    limit 1;
  end if;

  if v_existing_next is null then
    v_existing_next := v_first;
  else
    if v_existing_next < v_first then
      v_existing_next := v_first;
    end if;
  end if;

  if p_rule_id is null then
    insert into public.finance_recurring_rules (
      entity_type, entity_id,
      entry_type, category_id, category_name,
      amount_cents, currency, description,
      schedule, interval_n, day_of_week, day_of_month,
      start_date, end_date,
      next_run_date,
      active,
      created_by, updated_by
    )
    values (
      p_entity_type, p_entity_id,
      v_entry, p_category_id, nullif(btrim(coalesce(p_category_name,'')), ''),
      p_amount_cents, v_cur, v_desc,
      v_sched, v_int, p_day_of_week, p_day_of_month,
      v_start, v_end,
      v_existing_next,
      v_active,
      v_uid, v_uid
    )
    returning id into v_rule_id;
  else
    update public.finance_recurring_rules
    set
      entry_type = v_entry,
      category_id = p_category_id,
      category_name = nullif(btrim(coalesce(p_category_name,'')), ''),
      amount_cents = p_amount_cents,
      currency = v_cur,
      description = v_desc,
      schedule = v_sched,
      interval_n = v_int,
      day_of_week = p_day_of_week,
      day_of_month = p_day_of_month,
      start_date = v_start,
      end_date = v_end,
      next_run_date = v_existing_next,
      active = v_active,
      updated_at = now(),
      updated_by = v_uid
    where id = p_rule_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    returning id into v_rule_id;
  end if;

  if v_rule_id is null then
    raise exception 'Failed to save rule';
  end if;

  return query select v_rule_id as rule_id;
end;
$$;

revoke all on function public.finance_recurring_rule_upsert(
  text, uuid, uuid, text, bigint, text, text, text, int, int, int, date, date, uuid, text, boolean
) from public;
grant execute on function public.finance_recurring_rule_upsert(
  text, uuid, uuid, text, bigint, text, text, text, int, int, int, date, date, uuid, text, boolean
) to authenticated;

-- -----------------------------
-- RPC: deactivate (soft delete)
-- -----------------------------
create or replace function public.finance_recurring_rule_deactivate(
  p_entity_type text,
  p_entity_id uuid,
  p_rule_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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

  if p_rule_id is null then
    raise exception 'rule_id required';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  update public.finance_recurring_rules
  set active = false,
      updated_at = now(),
      updated_by = v_uid
  where id = p_rule_id
    and entity_type = p_entity_type
    and entity_id = p_entity_id;
end;
$$;

revoke all on function public.finance_recurring_rule_deactivate(text, uuid, uuid) from public;
grant execute on function public.finance_recurring_rule_deactivate(text, uuid, uuid) to authenticated;

-- -----------------------------
-- RPC: generate due entries (manual run)
-- Creates finance entries using finance_entry_upsert_manual + reference "recurring:<rule_id>:<run_date>"
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
    v_run_date := r.next_run_date;

    -- if end_date is before next run, skip
    if r.end_date is not null and v_run_date > r.end_date then
      insert into public.finance_recurring_rule_runs(rule_id, run_date, status, error, created_by)
      values (r.id, v_run_date, 'skipped', 'End date reached', v_uid)
      on conflict (rule_id, run_date) do nothing;

      return query select r.id, v_run_date, 'skipped', null::uuid;
      continue;
    end if;

    v_ref := 'recurring:' || r.id::text || ':' || v_run_date::text;

    -- already ran?
    select fr.finance_entry_id
      into v_existing
    from public.finance_recurring_rule_runs fr
    where fr.rule_id = r.id
      and fr.run_date = v_run_date
      and fr.status = 'created'
    limit 1;

    if v_existing is not null then
      return query select r.id, v_run_date, 'skipped', v_existing;
      continue;
    end if;

    -- best-effort: if a finance entry already exists with this reference, treat as created
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
      on conflict (rule_id, run_date) do nothing;

      return query select r.id, v_run_date, 'error', null::uuid;
      continue;
    end if;

    insert into public.finance_recurring_rule_runs(rule_id, run_date, status, finance_entry_id, created_by)
    values (r.id, v_run_date, 'created', v_fin, v_uid)
    on conflict (rule_id, run_date)
    do update set
      status = excluded.status,
      finance_entry_id = excluded.finance_entry_id;

    -- advance next_run_date by ONE interval (user can run again later to catch up)
    update public.finance_recurring_rules
    set next_run_date = public.finance_recurring_next_run_date(r.schedule, r.interval_n, v_run_date, r.day_of_month),
        updated_at = now(),
        updated_by = v_uid
    where id = r.id;

    return query select r.id, v_run_date, 'created', v_fin;
  end loop;

  return;
end;
$$;

revoke all on function public.finance_recurring_generate_due(text, uuid, date) from public;
grant execute on function public.finance_recurring_generate_due(text, uuid, date) to authenticated;

commit;
