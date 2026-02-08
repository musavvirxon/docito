-- File: supabase/migrations/20260207143000_finance_ledger_linking.sql
-- Step 25 (Ledger-first A): add source→ledger link table + default mapping table + helper RPC
-- Idempotent migration (safe to re-run)

begin;

-- -----------------------------------------------------------------------------
-- 1) Link table: tie any "source event" (payments, appointments, purchases, etc.)
--    to exactly one finance_entries row (prevents duplicates + adds traceability)
-- -----------------------------------------------------------------------------
create table if not exists public.finance_event_links (
  id uuid primary key default gen_random_uuid(),

  -- target entity
  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  -- source reference (generic to support uuid/int/text ids)
  source_table text not null,
  source_id text not null,

  -- ledger entry
  finance_entry_id uuid not null references public.finance_entries(id) on delete cascade,

  created_at timestamptz not null default now()
);

create index if not exists finance_event_links_entity_idx
  on public.finance_event_links (entity_type, entity_id);

create index if not exists finance_event_links_finance_entry_idx
  on public.finance_event_links (finance_entry_id);

create unique index if not exists finance_event_links_unique_source
  on public.finance_event_links (entity_type, entity_id, source_table, source_id);

alter table public.finance_event_links enable row level security;

-- -----------------------------------------------------------------------------
-- 2) Optional mapping table: define per-entity default category mapping for sources
--    (used later by "ledger-first" hooks so modules don't need hardcoding)
-- -----------------------------------------------------------------------------
create table if not exists public.finance_default_category_map (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  -- arbitrary key such as: 'payments', 'refunds', 'appointments', 'supplies', 'utilities', 'taxes'
  source_key text not null,

  -- which kind of ledger entry this mapping applies to
  entry_type public.finance_entry_type not null,

  -- desired category (by kind+name); category may be created on-demand in edge functions
  category_kind public.finance_category_kind not null,
  category_name text not null,

  is_active boolean not null default true,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_default_category_map_unique
  on public.finance_default_category_map (
    entity_type, entity_id, source_key, entry_type, category_kind, lower(trim(category_name))
  );

create index if not exists finance_default_category_map_entity_idx
  on public.finance_default_category_map (entity_type, entity_id);

alter table public.finance_default_category_map enable row level security;

-- updated_at trigger (re-use if already exists from prior migrations)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    -- no-op
  else
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end$$;

drop trigger if exists trg_finance_default_category_map_updated_at on public.finance_default_category_map;
create trigger trg_finance_default_category_map_updated_at
before update on public.finance_default_category_map
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) Helper RPC: idempotently link a source event to a finance entry
--    - Ensures finance_entry belongs to the same entity
--    - If link already exists, returns existing link id
--    - SECURITY INVOKER (default): respects RLS
-- -----------------------------------------------------------------------------
create or replace function public.finance_link_entry(
  p_entity_type text,
  p_entity_id uuid,
  p_source_table text,
  p_source_id text,
  p_finance_entry_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_link_id uuid;
  v_ok boolean;
begin
  if p_entity_type is null or length(trim(p_entity_type)) = 0 then
    raise exception 'entity_type is required';
  end if;

  if p_entity_id is null then
    raise exception 'entity_id is required';
  end if;

  if p_source_table is null or length(trim(p_source_table)) = 0 then
    raise exception 'source_table is required';
  end if;

  if p_source_id is null or length(trim(p_source_id)) = 0 then
    raise exception 'source_id is required';
  end if;

  if p_finance_entry_id is null then
    raise exception 'finance_entry_id is required';
  end if;

  -- ensure caller can access this entity (keeps behavior consistent everywhere)
  select public.can_access_entity(p_entity_type, p_entity_id) into v_ok;
  if not coalesce(v_ok, false) then
    raise exception 'forbidden';
  end if;

  -- ensure finance entry exists and belongs to the same entity (prevents cross-entity linking)
  if not exists (
    select 1
    from public.finance_entries fe
    where fe.id = p_finance_entry_id
      and fe.entity_type = p_entity_type
      and fe.entity_id = p_entity_id
  ) then
    raise exception 'finance entry not found for entity';
  end if;

  -- insert link if missing (idempotent)
  insert into public.finance_event_links (
    entity_type,
    entity_id,
    source_table,
    source_id,
    finance_entry_id
  )
  values (
    p_entity_type,
    p_entity_id,
    trim(p_source_table),
    trim(p_source_id),
    p_finance_entry_id
  )
  on conflict (entity_type, entity_id, source_table, source_id) do nothing;

  select fel.id
    into v_link_id
  from public.finance_event_links fel
  where fel.entity_type = p_entity_type
    and fel.entity_id = p_entity_id
    and fel.source_table = trim(p_source_table)
    and fel.source_id = trim(p_source_id)
  limit 1;

  return v_link_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) RLS policies
-- -----------------------------------------------------------------------------

-- finance_event_links
drop policy if exists "finance_event_links_select" on public.finance_event_links;
create policy "finance_event_links_select"
on public.finance_event_links
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_event_links_insert" on public.finance_event_links;
create policy "finance_event_links_insert"
on public.finance_event_links
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
);

drop policy if exists "finance_event_links_update" on public.finance_event_links;
create policy "finance_event_links_update"
on public.finance_event_links
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_event_links_delete" on public.finance_event_links;
create policy "finance_event_links_delete"
on public.finance_event_links
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- finance_default_category_map
drop policy if exists "finance_default_category_map_select" on public.finance_default_category_map;
create policy "finance_default_category_map_select"
on public.finance_default_category_map
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_default_category_map_insert" on public.finance_default_category_map;
create policy "finance_default_category_map_insert"
on public.finance_default_category_map
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "finance_default_category_map_update" on public.finance_default_category_map;
create policy "finance_default_category_map_update"
on public.finance_default_category_map
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "finance_default_category_map_delete" on public.finance_default_category_map;
create policy "finance_default_category_map_delete"
on public.finance_default_category_map
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

commit;
