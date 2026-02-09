-- File: supabase/migrations/20260208103000_finance_recurring_reference_uniqueness.sql
-- B31: Prevent duplicate recurring-generated finance entries by enforcing unique recurring reference per entity
-- - Adds partial unique index on finance_entries(entity_type, entity_id, reference) WHERE reference LIKE 'recurring:%'
-- - Replaces finance_entry_upsert_manual to be idempotent for recurring references (safe upsert by reference)
-- - Replaces finance_recurring_generate_due_v2 and finance_recurring_generate_due_system_v2 to insert with ON CONFLICT
-- Idempotent: guarded index creation + CREATE OR REPLACE functions

begin;

-- -------------------------------------------------------------------
-- Unique recurring reference per entity (prevents duplicates under concurrency)
-- -------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='finance_entries') then
    if not exists (
      select 1 from pg_indexes
      where schemaname='public' and indexname='finance_entries_recurring_ref_uq'
    ) then
      create unique index finance_entries_recurring_ref_uq
        on public.finance_entries(entity_type, entity_id, reference)
        where reference is not null and reference like 'recurring:%';
    end if;
  end if;
end $$;

-- -------------------------------------------------------------------
-- Replace: finance_entry_upsert_manual
-- - If p_entry_id is NULL and reference starts with "recurring:", upsert by reference (idempotent)
-- - Otherwise behaves as before
-- - Allows authenticated and service_role (from B27)
-- -------------------------------------------------------------------
create or replace function public.finance_entry_upsert_manual(
  p_entity_type text,
  p_entity_id uuid,

  p_entry_id uuid,
  p_entry_type text,
  p_amount_cents bigint,
  p_currency text,
  p_occurred_at timestamptz,

  p_category_id uuid default null,
  p_category_name text default null,

  p_description text default null,
  p_reference text default null
)
returns table (entry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := auth.role();

  v_type text := nullif(btrim(coalesce(p_entry_type,'')), '');
  v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), ''));
  v_desc text := nullif(btrim(coalesce(p_description,'')), '');
  v_ref  text := nullif(btrim(coalesce(p_reference,'')), '');

  v_cat uuid;
  v_id uuid;
  v_is_recurring boolean := false;
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

  if v_role <> 'service_role' and exists (select 1 from pg_proc where proname = 'can_access_entity') then
    if not public.can_access_entity(p_entity_type, p_entity_id) then
      raise exception 'Forbidden';
    end if;
  end if;

  if v_type is null or v_type not in ('income','expense','payroll') then
    raise exception 'Invalid entry_type';
  end if;

  if p_amount_cents is null then
    raise exception 'amount required';
  end if;

  if v_cur is null then v_cur := 'USD'; end if;

  v_is_recurring := (v_ref is not null and v_ref like 'recurring:%');

  -- Resolve category (auto-create by name when needed)
  v_cat := public.finance_category_get_or_create(
    p_entity_type,
    p_entity_id,
    v_type,
    p_category_id,
    p_category_name
  );

  -- Case 1: explicit entry_id update (standard)
  if p_entry_id is not null then
    update public.finance_entries
    set
      entry_type = v_type,
      amount_cents = p_amount_cents,
      currency = v_cur,
      occurred_at = coalesce(p_occurred_at, occurred_at),
      category_id = v_cat,
      description = v_desc,
      reference = v_ref,
      updated_at = now(),
      updated_by = v_uid
    where id = p_entry_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Failed to update entry';
    end if;

    return query select v_id as entry_id;
  end if;

  -- Case 2: recurring insert/upsert by reference (idempotent)
  if v_is_recurring then
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
      v_type, p_amount_cents, v_cur,
      coalesce(p_occurred_at, now()),
      v_cat,
      v_desc, v_ref,
      v_uid, v_uid
    )
    on conflict (entity_type, entity_id, reference)
      where reference is not null and reference like 'recurring:%'
    do update set
      entry_type = excluded.entry_type,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      occurred_at = excluded.occurred_at,
      category_id = excluded.category_id,
      description = excluded.description,
      updated_at = now(),
      updated_by = coalesce(auth.uid(), public.finance_entries.updated_by)
    returning id into v_id;

    if v_id is null then
      -- Should not happen, but keep safe fallback
      select e.id into v_id
      from public.finance_entries e
      where e.entity_type = p_entity_type
        and e.entity_id = p_entity_id
        and e.reference = v_ref
      limit 1;
    end if;

    if v_id is null then
      raise exception 'Failed to upsert recurring entry';
    end if;

    return query select v_id as entry_id;
  end if;

  -- Case 3: normal insert (no special uniqueness)
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
    v_type, p_amount_cents, v_cur,
    coalesce(p_occurred_at, now()),
    v_cat,
    v_desc, v_ref,
    v_uid, v_uid
  )
  returning id into v_id;

  if v_id is null then
    raise exception 'Failed to create entry';
  end if;

  return query select v_id as entry_id;
end;
$$;

revoke all on function public.finance_entry_upsert_manual(
  text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text
) from public;

grant execute on function public.finance_entry_upsert_manual(
  text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text
) to authenticated;

grant execute on function public.finance_entry_upsert_manual(
  text, uuid, uuid, text, bigint, text, timestamptz, uuid, text, text, text
) to service_role;

-- -------------------------------------------------------------------
-- Replace: finance_recurring_generate_due_v2
-- - Uses finance_entry_upsert_manual which is now idempotent for recurring refs
-- - Keeps entity_run_id linkage (B30)
-- -------------------------------------------------------------------
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

  v_rule_attempts int;
  v_total_attempts int := 0;
  v_rule_cap int := 50;
  v_total_cap int := 300;
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

      -- Create (idempotent by reference via finance_entry_upsert_manual)
      v_fin := null;
      select (x.entry_id)::uuid into v_fin
      from public.finance_entry_upsert_manual(
        p_entity_type := p_entity_type,
        p_entity_id := p_entity_id,

        p_entry_id := null,
        p_entry_type := r.entry_type,
        p_amount_cents := r.amount_cents,
        p_currency := r.currency,
        p_occurred_at := (v_run_date::timestamptz + interval '12 hours'),

        p_category_id := r.category_id,
        p_category_name := r.category_name,

        p_description := coalesce(r.description, 'Recurring ' || r.entry_type),
        p_reference := v_ref
      ) as x;

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

-- -------------------------------------------------------------------
-- Replace: finance_recurring_generate_due_system_v2
-- - Inserts finance_entries with ON CONFLICT on recurring references (idempotent)
-- - Keeps entity_run_id linkage (B30)
-- -------------------------------------------------------------------
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

      -- Insert finance entry idempotently by recurring reference
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
      on conflict (entity_type, entity_id, reference)
        where reference is not null and reference like 'recurring:%'
      do update set
        entry_type = excluded.entry_type,
        amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        occurred_at = excluded.occurred_at,
        category_id = excluded.category_id,
        description = excluded.description,
        updated_at = now()
      returning id into v_fin;

      if v_fin is null then
        select e.id into v_fin
        from public.finance_entries e
        where e.entity_type = p_entity_type
          and e.entity_id = p_entity_id
          and e.reference = v_ref
        limit 1;
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

commit;
