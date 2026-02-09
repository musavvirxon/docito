-- File: supabase/migrations/20260207184000_inventory_supplies_tracking.sql
-- B9: Supplies tracking submodule (inventory + purchases) with finance linkage
-- Idempotent migration

begin;

-- 0) updated_at trigger helper (if not already present)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    -- ok
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

-- 1) Inventory items
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null, -- 'clinic' | 'lab' | 'imaging' | 'pharmacy'
  entity_id uuid not null,

  name text not null,
  name_norm text generated always as (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) stored,

  sku text null,
  unit text not null default 'unit', -- e.g. box, pcs, ml, bottle

  min_stock_qty numeric(12,2) not null default 0 check (min_stock_qty >= 0),
  current_stock_qty numeric(12,2) not null default 0 check (current_stock_qty >= 0),

  is_active boolean not null default true,

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_items_unique_name
  on public.inventory_items(entity_type, entity_id, name_norm);

create index if not exists inventory_items_entity_idx
  on public.inventory_items(entity_type, entity_id);

create index if not exists inventory_items_active_idx
  on public.inventory_items(entity_type, entity_id, is_active)
  where is_active = true;

alter table public.inventory_items enable row level security;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- RLS: inventory items
drop policy if exists "inventory_items_select" on public.inventory_items;
create policy "inventory_items_select"
on public.inventory_items
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_items_insert" on public.inventory_items;
create policy "inventory_items_insert"
on public.inventory_items
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "inventory_items_update" on public.inventory_items;
create policy "inventory_items_update"
on public.inventory_items
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_items_delete" on public.inventory_items;
create policy "inventory_items_delete"
on public.inventory_items
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 2) Inventory purchases (header)
create table if not exists public.inventory_purchases (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null,
  entity_id uuid not null,

  vendor_name text null,
  vendor_phone text null,
  vendor_email text null,

  purchased_at timestamptz not null default now(),

  currency text not null default 'USD',
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),

  -- link to finance entry created for this purchase (B10 will create it)
  finance_entry_id uuid null references public.finance_entries(id) on delete set null,

  status text not null default 'draft', -- 'draft' | 'posted' | 'void'
  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_purchases_entity_idx
  on public.inventory_purchases(entity_type, entity_id, purchased_at desc);

create index if not exists inventory_purchases_finance_entry_idx
  on public.inventory_purchases(finance_entry_id);

alter table public.inventory_purchases enable row level security;

drop trigger if exists trg_inventory_purchases_updated_at on public.inventory_purchases;
create trigger trg_inventory_purchases_updated_at
before update on public.inventory_purchases
for each row execute function public.set_updated_at();

-- RLS: purchases
drop policy if exists "inventory_purchases_select" on public.inventory_purchases;
create policy "inventory_purchases_select"
on public.inventory_purchases
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_purchases_insert" on public.inventory_purchases;
create policy "inventory_purchases_insert"
on public.inventory_purchases
for insert
to authenticated
with check (
  public.can_access_entity(entity_type, entity_id)
  and created_by = auth.uid()
);

drop policy if exists "inventory_purchases_update" on public.inventory_purchases;
create policy "inventory_purchases_update"
on public.inventory_purchases
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_purchases_delete" on public.inventory_purchases;
create policy "inventory_purchases_delete"
on public.inventory_purchases
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 3) Purchase line items (detail)
create table if not exists public.inventory_purchase_items (
  id uuid primary key default gen_random_uuid(),

  purchase_id uuid not null references public.inventory_purchases(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  item_id uuid not null references public.inventory_items(id) on delete restrict,

  qty numeric(12,2) not null default 0 check (qty >= 0),
  unit_cost_cents integer not null default 0 check (unit_cost_cents >= 0),
  line_total_cents integer generated always as ((round(qty * unit_cost_cents))::int) stored,

  notes text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_purchase_items_unique
  on public.inventory_purchase_items(purchase_id, item_id);

create index if not exists inventory_purchase_items_entity_idx
  on public.inventory_purchase_items(entity_type, entity_id);

create index if not exists inventory_purchase_items_item_idx
  on public.inventory_purchase_items(item_id);

alter table public.inventory_purchase_items enable row level security;

drop trigger if exists trg_inventory_purchase_items_updated_at on public.inventory_purchase_items;
create trigger trg_inventory_purchase_items_updated_at
before update on public.inventory_purchase_items
for each row execute function public.set_updated_at();

-- RLS: purchase items
drop policy if exists "inventory_purchase_items_select" on public.inventory_purchase_items;
create policy "inventory_purchase_items_select"
on public.inventory_purchase_items
for select
to authenticated
using (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_purchase_items_insert" on public.inventory_purchase_items;
create policy "inventory_purchase_items_insert"
on public.inventory_purchase_items
for insert
to authenticated
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_purchase_items_update" on public.inventory_purchase_items;
create policy "inventory_purchase_items_update"
on public.inventory_purchase_items
for update
to authenticated
using (public.can_access_entity(entity_type, entity_id))
with check (public.can_access_entity(entity_type, entity_id));

drop policy if exists "inventory_purchase_items_delete" on public.inventory_purchase_items;
create policy "inventory_purchase_items_delete"
on public.inventory_purchase_items
for delete
to authenticated
using (public.can_access_entity(entity_type, entity_id));

-- 4) Convenience view: low stock items
create or replace view public.inventory_low_stock_v as
select
  i.id,
  i.entity_type,
  i.entity_id,
  i.name,
  i.sku,
  i.unit,
  i.current_stock_qty,
  i.min_stock_qty,
  (i.min_stock_qty - i.current_stock_qty) as shortage_qty,
  i.updated_at
from public.inventory_items i
where i.is_active = true
  and i.current_stock_qty <= i.min_stock_qty
order by (i.min_stock_qty - i.current_stock_qty) desc, i.name asc;

commit;
