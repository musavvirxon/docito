-- File: supabase/migrations/20260207212000_supplies_purchases.sql
-- B23: Supplies purchases (tables + RLS + RPC to create purchase and post expense entry)
-- Idempotent: create-if-not-exists patterns, create or replace functions

begin;

-- -----------------------------
-- Tables
-- -----------------------------
create table if not exists public.supplies_items (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,

  name text not null,
  sku text null,
  unit text null, -- e.g. "box", "piece", "bottle"
  active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='supplies_items_unique_entity_name'
  ) then
    create unique index supplies_items_unique_entity_name
      on public.supplies_items(entity_type, entity_id, lower(name));
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='supplies_items_entity_idx'
  ) then
    create index supplies_items_entity_idx
      on public.supplies_items(entity_type, entity_id);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_supplies_items_updated_at on public.supplies_items;
    create trigger trg_supplies_items_updated_at
    before update on public.supplies_items
    for each row
    execute function public.set_updated_at();
  end if;
exception when others then
  null;
end $$;

create table if not exists public.supplies_purchases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,

  occurred_at timestamptz not null default now(),
  vendor_name text null,
  currency text not null default 'USD',
  total_cents bigint not null default 0 check (total_cents >= 0),

  notes text null,

  -- linking to finance
  finance_entry_id uuid null,

  -- idempotency (optional)
  idempotency_key text null,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='supplies_purchases_entity_occurred_idx'
  ) then
    create index supplies_purchases_entity_occurred_idx
      on public.supplies_purchases(entity_type, entity_id, occurred_at desc);
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='supplies_purchases_entity_idempotency_unique'
  ) then
    create unique index supplies_purchases_entity_idempotency_unique
      on public.supplies_purchases(entity_type, entity_id, idempotency_key)
      where idempotency_key is not null and btrim(idempotency_key) <> '';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_supplies_purchases_updated_at on public.supplies_purchases;
    create trigger trg_supplies_purchases_updated_at
    before update on public.supplies_purchases
    for each row
    execute function public.set_updated_at();
  end if;
exception when others then
  null;
end $$;

create table if not exists public.supplies_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.supplies_purchases(id) on delete cascade,

  item_id uuid null references public.supplies_items(id) on delete set null,
  item_name text not null,

  qty numeric(12,3) not null default 1 check (qty > 0),
  unit_cost_cents bigint not null default 0 check (unit_cost_cents >= 0),
  line_total_cents bigint not null default 0 check (line_total_cents >= 0),

  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='supplies_purchase_items_purchase_idx'
  ) then
    create index supplies_purchase_items_purchase_idx
      on public.supplies_purchase_items(purchase_id);
  end if;
end $$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.supplies_items enable row level security;
alter table public.supplies_purchases enable row level security;
alter table public.supplies_purchase_items enable row level security;

drop policy if exists "supplies_items_select" on public.supplies_items;
drop policy if exists "supplies_items_insert" on public.supplies_items;
drop policy if exists "supplies_items_update" on public.supplies_items;
drop policy if exists "supplies_items_delete" on public.supplies_items;

create policy "supplies_items_select"
on public.supplies_items
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

create policy "supplies_items_insert"
on public.supplies_items
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

create policy "supplies_items_update"
on public.supplies_items
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

create policy "supplies_items_delete"
on public.supplies_items
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "supplies_purchases_select" on public.supplies_purchases;
drop policy if exists "supplies_purchases_insert" on public.supplies_purchases;
drop policy if exists "supplies_purchases_update" on public.supplies_purchases;
drop policy if exists "supplies_purchases_delete" on public.supplies_purchases;

create policy "supplies_purchases_select"
on public.supplies_purchases
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

create policy "supplies_purchases_insert"
on public.supplies_purchases
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

create policy "supplies_purchases_update"
on public.supplies_purchases
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

create policy "supplies_purchases_delete"
on public.supplies_purchases
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "supplies_purchase_items_select" on public.supplies_purchase_items;
drop policy if exists "supplies_purchase_items_insert" on public.supplies_purchase_items;
drop policy if exists "supplies_purchase_items_update" on public.supplies_purchase_items;
drop policy if exists "supplies_purchase_items_delete" on public.supplies_purchase_items;

create policy "supplies_purchase_items_select"
on public.supplies_purchase_items
for select
to authenticated
using (
  exists (
    select 1
    from public.supplies_purchases p
    where p.id = purchase_id
      and public.can_access_entity(p.entity_type, p.entity_id)
  )
);

create policy "supplies_purchase_items_insert"
on public.supplies_purchase_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.supplies_purchases p
    where p.id = purchase_id
      and public.can_access_entity(p.entity_type, p.entity_id)
  )
);

create policy "supplies_purchase_items_update"
on public.supplies_purchase_items
for update
to authenticated
using (
  exists (
    select 1
    from public.supplies_purchases p
    where p.id = purchase_id
      and public.can_access_entity(p.entity_type, p.entity_id)
  )
)
with check (
  exists (
    select 1
    from public.supplies_purchases p
    where p.id = purchase_id
      and public.can_access_entity(p.entity_type, p.entity_id)
  )
);

create policy "supplies_purchase_items_delete"
on public.supplies_purchase_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.supplies_purchases p
    where p.id = purchase_id
      and public.can_access_entity(p.entity_type, p.entity_id)
  )
);

-- -----------------------------
-- RPC: supplies_purchase_create
-- items jsonb array: [{ "name": "Gloves", "qty": 2, "unit_cost_cents": 1500 }]
-- Posts a finance expense entry (category: "Supplies") and links it to the purchase.
-- -----------------------------
create or replace function public.supplies_purchase_create(
  p_entity_type text,
  p_entity_id uuid,
  p_occurred_at timestamptz,
  p_currency text,
  p_vendor_name text,
  p_notes text,
  p_items jsonb,
  p_idempotency_key text default null
)
returns table (purchase_id uuid, finance_entry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cur text := upper(nullif(btrim(coalesce(p_currency,'')), ''));
  v_vendor text := nullif(btrim(coalesce(p_vendor_name,'')), '');
  v_notes text := nullif(btrim(coalesce(p_notes,'')), '');
  v_idem text := nullif(btrim(coalesce(p_idempotency_key,'')), '');
  v_purchase_id uuid;
  v_fin_entry_id uuid;
  v_total bigint := 0;
  v_occurred timestamptz := coalesce(p_occurred_at, now());
  v_item jsonb;
  v_name text;
  v_qty numeric(12,3);
  v_unit_cost bigint;
  v_line_total bigint;
  v_item_id uuid;
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

  if v_cur is null then
    v_cur := 'USD';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a json array';
  end if;

  -- If idempotency is provided and purchase exists, return it (and ensure finance entry exists)
  if v_idem is not null then
    select p.id, p.finance_entry_id
      into v_purchase_id, v_fin_entry_id
    from public.supplies_purchases p
    where p.entity_type = p_entity_type
      and p.entity_id = p_entity_id
      and p.idempotency_key = v_idem
    limit 1;

    if v_purchase_id is not null then
      -- if already has finance entry, return immediately
      if v_fin_entry_id is not null then
        return query select v_purchase_id, v_fin_entry_id;
        return;
      end if;
      -- else we'll compute totals from items already saved and create finance entry below
    end if;
  end if;

  -- Create purchase header (or reuse existing if idempotency conflict)
  if v_purchase_id is null then
    insert into public.supplies_purchases (
      entity_type, entity_id, occurred_at, vendor_name, currency, notes, total_cents, idempotency_key, created_by, updated_by
    )
    values (
      p_entity_type, p_entity_id, v_occurred, v_vendor, v_cur, v_notes, 0, v_idem, v_uid, v_uid
    )
    on conflict (entity_type, entity_id, idempotency_key)
    where idempotency_key is not null and btrim(idempotency_key) <> ''
    do update set
      updated_at = now(),
      updated_by = v_uid
    returning id, finance_entry_id into v_purchase_id, v_fin_entry_id;

    if v_purchase_id is null then
      -- Fallback: if conflict without returning (shouldn't happen), fetch by idempotency
      if v_idem is not null then
        select p.id, p.finance_entry_id
          into v_purchase_id, v_fin_entry_id
        from public.supplies_purchases p
        where p.entity_type = p_entity_type
          and p.entity_id = p_entity_id
          and p.idempotency_key = v_idem
        limit 1;
      end if;
    end if;

    if v_purchase_id is null then
      raise exception 'Failed to create purchase';
    end if;

    -- Insert line items ONLY if this purchase is new (no items yet)
    if not exists (select 1 from public.supplies_purchase_items i where i.purchase_id = v_purchase_id) then
      for v_item in
        select value from jsonb_array_elements(p_items)
      loop
        v_name := nullif(btrim(coalesce(v_item->>'name','')), '');
        if v_name is null then
          raise exception 'Each item requires a name';
        end if;

        v_qty := coalesce(nullif((v_item->>'qty')::numeric, 0), 1);
        if v_qty <= 0 then
          raise exception 'Invalid qty';
        end if;

        v_unit_cost := coalesce((v_item->>'unit_cost_cents')::bigint, 0);
        if v_unit_cost < 0 then
          raise exception 'Invalid unit_cost_cents';
        end if;

        v_line_total := (v_unit_cost * (v_qty * 1000)::bigint) / 1000; -- supports 3 decimals qty

        -- Ensure supplies item exists (best-effort)
        v_item_id := null;
        begin
          insert into public.supplies_items(entity_type, entity_id, name, created_by, updated_by)
          values (p_entity_type, p_entity_id, v_name, v_uid, v_uid)
          on conflict (entity_type, entity_id, lower(name))
          do update set
            active = true,
            updated_at = now(),
            updated_by = v_uid
          returning id into v_item_id;
        exception when others then
          v_item_id := null;
        end;

        insert into public.supplies_purchase_items(
          purchase_id, item_id, item_name, qty, unit_cost_cents, line_total_cents
        )
        values (
          v_purchase_id, v_item_id, v_name, v_qty, v_unit_cost, v_line_total
        );

        v_total := v_total + v_line_total;
      end loop;
    end if;
  end if;

  -- Compute total from stored items (covers idempotency reuse too)
  select coalesce(sum(i.line_total_cents), 0)::bigint
    into v_total
  from public.supplies_purchase_items i
  where i.purchase_id = v_purchase_id;

  update public.supplies_purchases
  set total_cents = v_total,
      currency = v_cur,
      vendor_name = coalesce(v_vendor, vendor_name),
      notes = coalesce(v_notes, notes),
      occurred_at = v_occurred,
      updated_at = now(),
      updated_by = v_uid
  where id = v_purchase_id;

  -- Create finance expense entry if missing
  if v_fin_entry_id is null then
    -- Uses existing finance RPC that supports creating category by name
    select (x.entry_id)::uuid into v_fin_entry_id
    from public.finance_entry_upsert_manual(
      p_entity_type := p_entity_type,
      p_entity_id := p_entity_id,

      p_entry_id := null,
      p_entry_type := 'expense',
      p_amount_cents := v_total,
      p_currency := v_cur,
      p_occurred_at := v_occurred,

      p_category_id := null,
      p_category_name := 'Supplies',

      p_description := case
        when v_vendor is not null then ('Supplies purchase - ' || v_vendor)
        else 'Supplies purchase'
      end,
      p_reference := ('supplies:' || v_purchase_id::text)
    ) as x;

    update public.supplies_purchases
    set finance_entry_id = v_fin_entry_id,
        updated_at = now(),
        updated_by = v_uid
    where id = v_purchase_id;
  end if;

  return query select v_purchase_id, v_fin_entry_id;
end;
$$;

revoke all on function public.supplies_purchase_create(text, uuid, timestamptz, text, text, text, jsonb, text) from public;
grant execute on function public.supplies_purchase_create(text, uuid, timestamptz, text, text, text, jsonb, text) to authenticated;

commit;
