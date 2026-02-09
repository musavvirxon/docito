-- File: supabase/migrations/20260207195000_inventory_adjustments.sql
-- B13: Inventory items management support + stock adjustments (audit trail)
-- Idempotent migration

begin;

-- 1) Stock adjustments table (audit log)
create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  item_id uuid not null references public.inventory_items(id) on delete restrict,

  -- positive or negative delta (e.g. -2 for usage, +5 for manual add)
  delta_qty numeric(12,2) not null check (delta_qty <> 0),

  reason text not null default 'manual', -- 'manual' | 'count' | 'waste' | 'usage' | 'correction'
  note text null,

  occurred_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_adjustments_entity_idx
  on public.inventory_adjustments(entity_type, entity_id, occurred_at desc);

create index if not exists inventory_adjustments_item_idx
  on public.inventory_adjustments(item_id, occurred_at desc);

alter table public.inventory_adjustments enable row level security;

-- RLS: adjustments
drop policy if exists "inventory_adjustments_select" on public.inventory_adjustments;
create policy "inventory_adjustments_select"
on public.inventory_adjustments
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_adjustments_insert" on public.inventory_adjustments;
create policy "inventory_adjustments_insert"
on public.inventory_adjustments
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "inventory_adjustments_delete" on public.inventory_adjustments;
create policy "inventory_adjustments_delete"
on public.inventory_adjustments
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 2) RPC: apply adjustment and update stock atomically
create or replace function public.inventory_adjust_stock(
  p_entity_type text,
  p_entity_id uuid,
  p_item_id uuid,
  p_delta_qty numeric,
  p_reason text,
  p_note text,
  p_occurred_at timestamptz
)
returns table (
  adjustment_id uuid,
  item_id uuid,
  new_stock_qty numeric(12,2)
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new numeric(12,2);
  v_adj_id uuid;
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

  -- Ensure item belongs to entity
  if not exists (
    select 1
    from public.inventory_items ii
    where ii.id = p_item_id
      and ii.entity_type = p_entity_type
      and ii.entity_id = p_entity_id
  ) then
    raise exception 'Inventory item not found for entity';
  end if;

  -- Update stock (prevent negative)
  update public.inventory_items
    set current_stock_qty = greatest(0, current_stock_qty + p_delta_qty)
    where id = p_item_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    returning current_stock_qty into v_new;

  -- Insert adjustment record (record real delta requested; stock clamp is visible via new_stock_qty)
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
    coalesce(p_occurred_at, now()),
    v_uid
  )
  returning id into v_adj_id;

  adjustment_id := v_adj_id;
  item_id := p_item_id;
  new_stock_qty := v_new;
  return next;
end;
$$;

revoke all on function public.inventory_adjust_stock(text, uuid, uuid, numeric, text, text, timestamptz) from public;
grant execute on function public.inventory_adjust_stock(text, uuid, uuid, numeric, text, text, timestamptz) to authenticated;

commit;
