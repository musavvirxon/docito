-- File: supabase/migrations/20260207191000_inventory_purchase_create_rpc.sql
-- B10: One-transaction purchase creation + finance posting via RPC (idempotent)
-- - Adds inventory_purchases.idempotency_key (unique per entity)
-- - Adds RPC: public.inventory_purchase_create(...)
-- - RPC inserts purchase + items, updates stock, creates finance expense entry, links via finance_event_links
-- Idempotent migration

begin;

-- 1) idempotency key for purchases (unique per entity)
alter table public.inventory_purchases
  add column if not exists idempotency_key text null;

create unique index if not exists inventory_purchases_idempotency_unique
  on public.inventory_purchases(entity_type, entity_id, idempotency_key)
  where idempotency_key is not null;

-- 2) RPC: create purchase + post finance entry (transactional)
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

  -- Insert items + compute total + update stock
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

    -- Ensure item belongs to entity
    if not exists (
      select 1
      from public.inventory_items ii
      where ii.id = v_item_id
        and ii.entity_type = p_entity_type
        and ii.entity_id = p_entity_id
        and ii.is_active = true
    ) then
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

    -- Update stock (increase on purchase)
    update public.inventory_items
      set current_stock_qty = current_stock_qty + v_qty
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

  -- Link finance entry idempotently (if finance_event_links exists and enforces uniqueness)
  -- source_id uses the idempotency key so replays do not double-post.
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

revoke all on function public.inventory_purchase_create(
  text, uuid, text, timestamptz, text, text, text, text, text, uuid, jsonb
) from public;

grant execute on function public.inventory_purchase_create(
  text, uuid, text, timestamptz, text, text, text, text, text, uuid, jsonb
) to authenticated;

commit
