-- File: supabase/migrations/20260208091000_finance_entry_category_autocreate.sql
-- B26: Auto-resolve / auto-create finance categories by name when inserting manual entries (and recurring rules)
-- - Adds helper: finance_category_get_or_create
-- - Replaces: finance_entry_upsert_manual to always resolve category_id when category_name is provided
-- - Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE functions

begin;

-- -------------------------------------------------------------------
-- Safety: ensure base tables exist (matches our finance module schema)
-- -------------------------------------------------------------------
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  kind text not null check (kind in ('income','expense','payroll')),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,

  entry_type text not null check (entry_type in ('income','expense','payroll')),
  amount_cents bigint not null,
  currency text not null default 'USD',

  occurred_at timestamptz not null default now(),

  category_id uuid null references public.finance_categories(id) on delete set null,

  description text null,
  reference text null,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_categories_entity_kind_name_uq'
  ) then
    create unique index finance_categories_entity_kind_name_uq
      on public.finance_categories(entity_type, entity_id, kind, lower(name));
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_entries_entity_occurred_idx'
  ) then
    create index finance_entries_entity_occurred_idx
      on public.finance_entries(entity_type, entity_id, occurred_at desc);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_entries_entity_category_idx'
  ) then
    create index finance_entries_entity_category_idx
      on public.finance_entries(entity_type, entity_id, category_id);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='finance_entries_reference_idx'
  ) then
    create index finance_entries_reference_idx
      on public.finance_entries(entity_type, entity_id, reference);
  end if;
end $$;

-- -------------------------------------------------------------------
-- RLS (only if helper can_access_entity exists; safe if not)
-- -------------------------------------------------------------------
do $$
begin
  perform 1 from pg_proc where proname = 'can_access_entity';
  -- finance_categories
  execute 'alter table public.finance_categories enable row level security';
  execute 'drop policy if exists "finance_categories_select" on public.finance_categories';
  execute 'drop policy if exists "finance_categories_insert" on public.finance_categories';
  execute 'drop policy if exists "finance_categories_update" on public.finance_categories';
  execute 'drop policy if exists "finance_categories_delete" on public.finance_categories';

  execute $pol$
    create policy "finance_categories_select"
    on public.finance_categories
    for select
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_categories_insert"
    on public.finance_categories
    for insert
    to authenticated
    with check (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_categories_update"
    on public.finance_categories
    for update
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
    with check (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_categories_delete"
    on public.finance_categories
    for delete
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
  $pol$;

  -- finance_entries
  execute 'alter table public.finance_entries enable row level security';
  execute 'drop policy if exists "finance_entries_select" on public.finance_entries';
  execute 'drop policy if exists "finance_entries_insert" on public.finance_entries';
  execute 'drop policy if exists "finance_entries_update" on public.finance_entries';
  execute 'drop policy if exists "finance_entries_delete" on public.finance_entries';

  execute $pol$
    create policy "finance_entries_select"
    on public.finance_entries
    for select
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_entries_insert"
    on public.finance_entries
    for insert
    to authenticated
    with check (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_entries_update"
    on public.finance_entries
    for update
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
    with check (public.can_access_entity(entity_type, entity_id))
  $pol$;

  execute $pol$
    create policy "finance_entries_delete"
    on public.finance_entries
    for delete
    to authenticated
    using (public.can_access_entity(entity_type, entity_id))
  $pol$;
exception
  when undefined_function then
    -- can_access_entity not present; skip RLS setup
    null;
end $$;

-- -------------------------------------------------------------------
-- Helper: Get or create category by name (case-insensitive)
-- -------------------------------------------------------------------
create or replace function public.finance_category_get_or_create(
  p_entity_type text,
  p_entity_id uuid,
  p_kind text,
  p_category_id uuid,
  p_category_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := nullif(btrim(coalesce(p_kind,'')), '');
  v_name text := nullif(btrim(coalesce(p_category_name,'')), '');
  v_id uuid := p_category_id;
  v_found uuid;
begin
  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;
  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if v_kind is null or v_kind not in ('income','expense','payroll') then
    raise exception 'Invalid kind';
  end if;

  -- If id provided, validate it belongs to this entity + kind
  if v_id is not null then
    select c.id
      into v_found
    from public.finance_categories c
    where c.id = v_id
      and c.entity_type = p_entity_type
      and c.entity_id = p_entity_id
      and c.kind = v_kind
    limit 1;

    if v_found is null then
      raise exception 'Invalid category_id for entity/kind';
    end if;

    return v_found;
  end if;

  -- If no name, no category
  if v_name is null then
    return null;
  end if;

  -- Find existing by case-insensitive name
  select c.id
    into v_found
  from public.finance_categories c
  where c.entity_type = p_entity_type
    and c.entity_id = p_entity_id
    and c.kind = v_kind
    and lower(c.name) = lower(v_name)
  limit 1;

  if v_found is not null then
    return v_found;
  end if;

  -- Create new, handling races via unique index
  insert into public.finance_categories(entity_type, entity_id, kind, name)
  values (p_entity_type, p_entity_id, v_kind, v_name)
  on conflict (entity_type, entity_id, kind, lower(name))
  do update set name = excluded.name
  returning id into v_found;

  return v_found;
end;
$$;

revoke all on function public.finance_category_get_or_create(text, uuid, text, uuid, text) from public;
grant execute on function public.finance_category_get_or_create(text, uuid, text, uuid, text) to authenticated;

-- -------------------------------------------------------------------
-- RPC: Manual upsert entry (now auto-resolves category by name)
-- Signature matches calls from recurring generator (B24/B25).
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
  v_type text := nullif(btrim(coalesce(p_entry_type,'')), '');
  v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), ''));
  v_desc text := nullif(btrim(coalesce(p_description,'')), '');
  v_ref  text := nullif(btrim(coalesce(p_reference,'')), '');

  v_cat uuid;
  v_id uuid;
begin
  -- Auth / access check (only when can_access_entity exists)
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id required';
  end if;

  if exists (select 1 from pg_proc where proname = 'can_access_entity') then
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

  -- Resolve category
  v_cat := public.finance_category_get_or_create(
    p_entity_type,
    p_entity_id,
    v_type,
    p_category_id,
    p_category_name
  );

  if p_entry_id is null then
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
  else
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
  end if;

  if v_id is null then
    raise exception 'Failed to save entry';
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

commit;
