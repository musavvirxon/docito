-- File: supabase/migrations/20260207197000_inventory_cost_and_consumption.sql
-- B14: Inventory average cost + optional consumption posting to finance
-- - Adds avg_unit_cost_cents to inventory_items
-- - Adds finance_ensure_category() helper
-- - Upgrades inventory_purchase_create() to maintain avg_unit_cost_cents (weighted average)
-- - Adds inventory_adjust_stock_v2() to (optionally) post negative adjustments as finance expenses using avg cost
-- Idempotent migration

begin;

-- 1) Add avg unit cost to inventory items (weighted average, cents per unit)
alter table public.inventory_items
  add column if not exists avg_unit_cost_cents integer not null default 0
    check (avg_unit_cost_cents >= 0);

-- 2) Helper: ensure a category exists (by normalized name) and return its id
create or replace function public.finance_ensure_category(
  p_entity_type text,
  p_entity_id uuid,
  p_kind text,          -- 'expense' | 'income' | 'payroll'
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text;
  v_id uuid;
  v_kind text;
  v_name text;
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

  v_kind := lower(btrim(coalesce(p_kind, '')));
  if v_kind not in ('expense', 'income', 'payroll') then
    raise exception 'Invalid category kind: %', v_kind;
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception 'name required';
  end if;

  v_norm := lower(regexp_replace(trim(v_name), '\s+', ' ', 'g'));

  select c.id into v_id
  from public.finance_categories c
  where c.entity_type = p_entity_type
    and c.entity_id = p_entity_id
    and c.kind::text = v_kind
    and lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = v_norm
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.finance_categories (
    entity_type,
    entity_id,
    kind,
    name,
    is_default,
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    v_kind::public.finance_category_kind,
    v_name,
    false,
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.finance_ensure_category(text, uuid, text, text) from public;
grant execute on function public.finance_ensure_category(text, uuid, text, text) to authenticated;

-- 3) Upgrade purchase RPC (B10) to update avg_unit_cost_cents using weighted average
--    NOTE: Signature is unchanged.
create or replace function public.inventory_purchase_create(
  p_entity_type text,
  p_entity_id uuid,
  p_idempotency_key text,
  p_purchased_at timestamptz,
  p_currency text,
  p_vendor_name text,
  p_vendor_phone text,
  p_vendor_email text,
  p_notes text,
  p_expense_category_id uuid,
  p_items jsonb
)
returns table (
  purchase_id uuid,
  finance_entry_id uuid,
  total_amount_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_purchase_id uuid;
  v_finance_entry_id uuid;
  v_total int := 0;
  v_item jsonb;
  v_item_id uuid;
  v_qty numeric(12,2);
  v_unit_cost int;
  v_line_total int;
  v_desc text;

  v_old_stock numeric(12,2);
  v_old_avg int;
  v_new_avg int;
  v_den numeric(18,6);
  v_num numeric(18,6);
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

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'idempotency_key required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items[] required';
  end if;

  if p_expense_category_id is null then
    raise exception 'expense_category_id required';
  end if;

  -- If already created with same idempotency key, return existing
  select ip.id, ip.finance_entry_id, ip.total_amount_cents
    into v_purchase_id, v_finance_entry_id, v_total
  from public.inventory_purchases ip
  where ip.entity_type = p_entity_type
    and ip.entity_id = p_entity_id
    and ip.idempotency_key = p_idempotency_key
  limit 1;

  if v_purchase_id is not null then
    purchase_id := v_purchase_id;
    finance_entry_id := v_finance_entry_id;
    total_amount_cents := coalesce(v_total, 0);
    return next;
    return;
  end if;

  -- Insert purchase header (draft first)
  insert into public.inventory_purchases (
    entity_type,
    entity_id,
    vendor_name,
    vendor_phone,
    vendor_email,
    purchased_at,
    currency,
    total_amount_cents,
    finance_entry_id,
    status,
    notes,
    idempotency_key,
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    nullif(btrim(coalesce(p_vendor_name, '')), ''),
    nullif(btrim(coalesce(p_vendor_phone, '')), ''),
    nullif(btrim(coalesce(p_vendor_email, '')), ''),
    coalesce(p_purchased_at, now()),
    upper(nullif(btrim(coalesce(p_currency, '')), '')),
    0,
    null,
    'draft',
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_idempotency_key,
    v_uid
  )
  returning id into v_purchase_id;

  -- Insert items + compute total + update stock + update avg cost
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item->>'item_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_unit_cost := coalesce((v_item->>'unit_cost_cents')::int, 0);

    if v_item_id is null then
      raise exception 'item_id required';
    end if;

    if v_qty is null or v_qty <= 0 then
      raise exception 'qty must be > 0';
    end if;

    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'unit_cost_cents must be >= 0';
    end if;

    -- Ensure item belongs to entity (and lock row so avg+stock update is consistent)
    select ii.current_stock_qty, ii.avg_unit_cost_cents
      into v_old_stock, v_old_avg
    from public.inventory_items ii
    where ii.id = v_item_id
      and ii.entity_type = p_entity_type
      and ii.entity_id = p_entity_id
      and ii.is_active = true
    for update;

    if not found then
      raise exception 'Inventory item not found for entity: %', v_item_id;
    end if;

    v_line_total := (round(v_qty * v_unit_cost))::int;
    v_total := v_total + v_line_total;

    insert into public.inventory_purchase_items (
      purchase_id,
      entity_type,
      entity_id,
      item_id,
      qty,
      unit_cost_cents,
      notes,
      created_by
    ) values (
      v_purchase_id,
      p_entity_type,
      p_entity_id,
      v_item_id,
      v_qty,
      v_unit_cost,
      nullif(btrim(coalesce(v_item->>'notes', '')), ''),
      v_uid
    )
    on conflict (purchase_id, item_id) do update
      set qty = excluded.qty,
          unit_cost_cents = excluded.unit_cost_cents,
          notes = excluded.notes;

    -- Weighted average cost update (cents/unit)
    -- new_avg = (old_stock*old_avg + qty*unit_cost) / (old_stock+qty)
    v_den := (coalesce(v_old_stock, 0) + v_qty);
    if v_den <= 0 then
      v_new_avg := greatest(0, v_unit_cost);
    else
      v_num := (coalesce(v_old_stock, 0) * coalesce(v_old_avg, 0)) + (v_qty * v_unit_cost);
      v_new_avg := greatest(0, round(v_num / v_den)::int);
    end if;

    update public.inventory_items
      set current_stock_qty = current_stock_qty + v_qty,
          avg_unit_cost_cents = v_new_avg
      where id = v_item_id
        and entity_type = p_entity_type
        and entity_id = p_entity_id;
  end loop;

  -- Create finance expense entry
  v_desc := 'Supplies purchase';
  if nullif(btrim(coalesce(p_vendor_name, '')), '') is not null then
    v_desc := v_desc || ': ' || btrim(p_vendor_name);
  end if;

  insert into public.finance_entries (
    entity_type,
    entity_id,
    entry_type,
    amount_cents,
    currency,
    occurred_at,
    category_id,
    description,
    metadata,
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    'expense',
    v_total,
    upper(coalesce(nullif(btrim(p_currency), ''), 'USD')),
    coalesce(p_purchased_at, now()),
    p_expense_category_id,
    v_desc,
    jsonb_build_object(
      'purchase_id', v_purchase_id,
      'idempotency_key', p_idempotency_key,
      'module', 'inventory'
    ),
    v_uid
  )
  returning id into v_finance_entry_id;

  -- Link finance entry idempotently
  insert into public.finance_event_links (
    entity_type,
    entity_id,
    finance_entry_id,
    source_table,
    source_id,
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    v_finance_entry_id,
    'inventory_purchases',
    'inventory_purchase:' || p_idempotency_key,
    v_uid
  )
  on conflict do nothing;

  -- Update purchase totals and link
  update public.inventory_purchases
    set total_amount_cents = v_total,
        finance_entry_id = v_finance_entry_id,
        status = 'posted'
    where id = v_purchase_id;

  purchase_id := v_purchase_id;
  finance_entry_id := v_finance_entry_id;
  total_amount_cents := v_total;
  return next;
end;
$$;

-- 4) New RPC: adjust stock + optional finance posting for consumption (negative delta)
create or replace function public.inventory_adjust_stock_v2(
  p_entity_type text,
  p_entity_id uuid,
  p_item_id uuid,
  p_delta_qty numeric,
  p_reason text,
  p_note text,
  p_occurred_at timestamptz,
  p_post_to_finance boolean,
  p_expense_category_name text
)
returns table (
  adjustment_id uuid,
  finance_entry_id uuid,
  new_stock_qty numeric(12,2),
  posted_amount_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new numeric(12,2);
  v_adj_id uuid;

  v_item_name text;
  v_unit text;
  v_avg_cost int;

  v_post boolean := coalesce(p_post_to_finance, false);
  v_finance_id uuid;
  v_amount int := 0;
  v_cat_id uuid;
  v_occ timestamptz := coalesce(p_occurred_at, now());
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

  if p_item_id is null then
    raise exception 'item_id required';
  end if;

  if p_delta_qty is null or p_delta_qty = 0 then
    raise exception 'delta_qty must be non-zero';
  end if;

  if not public.can_access_entity(p_entity_type, p_entity_id) then
    raise exception 'Forbidden';
  end if;

  -- Lock item row
  select ii.name, ii.unit, ii.avg_unit_cost_cents
    into v_item_name, v_unit, v_avg_cost
  from public.inventory_items ii
  where ii.id = p_item_id
    and ii.entity_type = p_entity_type
    and ii.entity_id = p_entity_id
  for update;

  if not found then
    raise exception 'Inventory item not found for entity';
  end if;

  -- Update stock (prevent negative)
  update public.inventory_items
    set current_stock_qty = greatest(0, current_stock_qty + p_delta_qty)
    where id = p_item_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    returning current_stock_qty into v_new;

  -- Insert adjustment record
  insert into public.inventory_adjustments (
    entity_type,
    entity_id,
    item_id,
    delta_qty,
    reason,
    note,
    occurred_at,
    created_by
  ) values (
    p_entity_type,
    p_entity_id,
    p_item_id,
    p_delta_qty,
    coalesce(nullif(btrim(p_reason), ''), 'manual'),
    nullif(btrim(coalesce(p_note, '')), ''),
    v_occ,
    v_uid
  )
  returning id into v_adj_id;

  -- Optional finance posting:
  -- Only post if delta is negative (consumption) and post flag is enabled.
  if v_post = true and p_delta_qty < 0 then
    v_cat_id := public.finance_ensure_category(
      p_entity_type,
      p_entity_id,
      'expense',
      coalesce(nullif(btrim(coalesce(p_expense_category_name, '')), ''), 'Supplies usage')
    );

    -- amount = abs(delta) * avg_unit_cost_cents
    v_amount := greatest(0, round(abs(p_delta_qty) * coalesce(v_avg_cost, 0))::int);

    insert into public.finance_entries (
      entity_type,
      entity_id,
      entry_type,
      amount_cents,
      currency,
      occurred_at,
      category_id,
      description,
      metadata,
      created_by
    ) values (
      p_entity_type,
      p_entity_id,
      'expense',
      v_amount,
      -- keep currency aligned with entity default; fall back to USD
      'USD',
      v_occ,
      v_cat_id,
      'Supplies consumption: ' || coalesce(v_item_name, 'item'),
      jsonb_build_object(
        'module', 'inventory',
        'adjustment_id', v_adj_id,
        'item_id', p_item_id,
        'delta_qty', p_delta_qty,
        'avg_unit_cost_cents', coalesce(v_avg_cost, 0)
      ),
      v_uid
    )
    returning id into v_finance_id;

    -- Link idempotently by adjustment id
    insert into public.finance_event_links (
      entity_type,
      entity_id,
      finance_entry_id,
      source_table,
      source_id,
      created_by
    ) values (
      p_entity_type,
      p_entity_id,
      v_finance_id,
      'inventory_adjustments',
      'inventory_adj:' || v_adj_id::text,
      v_uid
    )
    on conflict do nothing;
  end if;

  adjustment_id := v_adj_id;
  finance_entry_id := v_finance_id;
  new_stock_qty := v_new;
  posted_amount_cents := coalesce(v_amount, 0);
  return next;
end;
$$;

revoke all on function public.inventory_adjust_stock_v2(text, uuid, uuid, numeric, text, text, timestamptz, boolean, text) from public;
grant execute on function public.inventory_adjust_stock_v2(text, uuid, uuid, numeric, text, text, timestamptz, boolean, text) to authenticated;

commit;
