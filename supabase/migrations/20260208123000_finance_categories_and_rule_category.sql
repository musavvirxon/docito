-- File: supabase/migrations/20260208123000_finance_categories_and_rule_category.sql
-- B38: Finance categories (per entity) + wire recurring rules to categories + RLS
-- - Creates: finance_categories
-- - Adds: category_id to finance_recurring_rules
-- - Enables RLS + policies for finance_categories / finance_entries / finance_recurring_rules
-- - Updates recurring executor RPCs to carry category_id into created finance_entries
-- Idempotent via IF NOT EXISTS + pg catalog guards

begin;

-- ============= FINANCE CATEGORIES =============

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  name text not null,
  color text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_categories_entity_idx
  on public.finance_categories (entity_type, entity_id, name);

-- Prevent duplicate category names per entity (case-insensitive)
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'finance_categories_unique_name_per_entity'
  ) then
    execute 'create unique index finance_categories_unique_name_per_entity
             on public.finance_categories (entity_type, entity_id, lower(name))';
  end if;
end $$;

-- ============= RULES: ADD CATEGORY =============

alter table public.finance_recurring_rules
  add column if not exists category_id uuid null;

create index if not exists finance_recurring_rules_category_idx
  on public.finance_recurring_rules (category_id);

-- ============= RLS (SAFE / IDEMPOTENT) =============

-- finance_categories
alter table public.finance_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_categories' and policyname='finance_categories_select'
  ) then
    execute 'create policy finance_categories_select on public.finance_categories
             for select to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_categories' and policyname='finance_categories_insert'
  ) then
    execute 'create policy finance_categories_insert on public.finance_categories
             for insert to authenticated
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_categories' and policyname='finance_categories_update'
  ) then
    execute 'create policy finance_categories_update on public.finance_categories
             for update to authenticated
             using (public.can_access_entity(entity_type, entity_id))
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_categories' and policyname='finance_categories_delete'
  ) then
    execute 'create policy finance_categories_delete on public.finance_categories
             for delete to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;
end $$;

-- finance_entries (ensure RLS exists and has policies)
alter table public.finance_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_entries' and policyname='finance_entries_select'
  ) then
    execute 'create policy finance_entries_select on public.finance_entries
             for select to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_entries' and policyname='finance_entries_insert'
  ) then
    execute 'create policy finance_entries_insert on public.finance_entries
             for insert to authenticated
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_entries' and policyname='finance_entries_update'
  ) then
    execute 'create policy finance_entries_update on public.finance_entries
             for update to authenticated
             using (public.can_access_entity(entity_type, entity_id))
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_entries' and policyname='finance_entries_delete'
  ) then
    execute 'create policy finance_entries_delete on public.finance_entries
             for delete to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;
end $$;

-- finance_recurring_rules (ensure RLS exists and has policies)
alter table public.finance_recurring_rules enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rules' and policyname='finance_recurring_rules_select'
  ) then
    execute 'create policy finance_recurring_rules_select on public.finance_recurring_rules
             for select to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rules' and policyname='finance_recurring_rules_insert'
  ) then
    execute 'create policy finance_recurring_rules_insert on public.finance_recurring_rules
             for insert to authenticated
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rules' and policyname='finance_recurring_rules_update'
  ) then
    execute 'create policy finance_recurring_rules_update on public.finance_recurring_rules
             for update to authenticated
             using (public.can_access_entity(entity_type, entity_id))
             with check (public.can_access_entity(entity_type, entity_id))';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_recurring_rules' and policyname='finance_recurring_rules_delete'
  ) then
    execute 'create policy finance_recurring_rules_delete on public.finance_recurring_rules
             for delete to authenticated
             using (public.can_access_entity(entity_type, entity_id))';
  end if;
end $$;

-- ============= UPDATE RECURRING EXECUTOR RPCs TO CARRY category_id =============

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
          r.category_id,
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

revoke all on function public.finance_apply_recurring_rules(text, uuid, date, boolean, int) from public;
grant execute on function public.finance_apply_recurring_rules(text, uuid, date, boolean, int) to authenticated;

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
          r.category_id,
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
grant execute on function public.finance_apply_recurring_rules_service(text, uuid, date, boolean, int) to service_role;

commit;
