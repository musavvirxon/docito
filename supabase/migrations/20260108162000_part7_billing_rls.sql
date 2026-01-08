begin;

-- ============================================================
-- PART 7C: Billing core tables with RLS
-- ============================================================

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practices(id) on delete set null,
  patient_id uuid not null,
  appointment_id uuid references public.appointments(id) on delete set null,

  status text not null default 'draft' check (status in ('draft','issued','paid','void','cancelled')),
  currency text not null default 'USD',
  total_amount numeric not null default 0,
  notes text,

  created_by uuid not null,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_patient on public.invoices (patient_id);
create index if not exists idx_invoices_practice on public.invoices (practice_id);
create index if not exists idx_invoices_status on public.invoices (status);

alter table public.invoices enable row level security;

-- Invoice items
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,

  description text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  amount numeric generated always as (quantity * unit_price) stored,

  procedure_id uuid references public.procedures(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_items (invoice_id);

alter table public.invoice_items enable row level security;

-- Payments (provider-agnostic; webhook fills provider fields)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  practice_id uuid references public.practices(id) on delete set null,
  patient_id uuid not null,

  provider text,              -- 'stripe','click','payme',etc
  provider_payment_id text,   -- id from provider
  amount numeric not null default 0,
  currency text not null default 'USD',

  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','void')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),

  unique (provider, provider_payment_id)
);

create index if not exists idx_payments_patient on public.payments (patient_id);
create index if not exists idx_payments_invoice on public.payments (invoice_id);
create index if not exists idx_payments_status on public.payments (status);

alter table public.payments enable row level security;

-- ------------------------------------------------------------
-- RLS: Invoices
-- ------------------------------------------------------------
drop policy if exists "Invoices: select by patient or practice access" on public.invoices;
create policy "Invoices: select by patient or practice access"
on public.invoices for select
using (
  patient_id = auth.uid()
  or (practice_id is not null and public.can_access_practice(practice_id))
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

drop policy if exists "Invoices: practice access write" on public.invoices;
create policy "Invoices: practice access write"
on public.invoices for insert
with check (
  created_by = auth.uid()
  and (practice_id is not null and public.can_access_practice(practice_id))
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

drop policy if exists "Invoices: practice access update" on public.invoices;
create policy "Invoices: practice access update"
on public.invoices for update
using (
  (practice_id is not null and public.can_access_practice(practice_id))
  or public.has_role(auth.uid(), 'super_admin'::app_role)
)
with check (
  (practice_id is not null and public.can_access_practice(practice_id))
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- ------------------------------------------------------------
-- RLS: Invoice items
-- ------------------------------------------------------------
drop policy if exists "Invoice items: select by invoice access" on public.invoice_items;
create policy "Invoice items: select by invoice access"
on public.invoice_items for select
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        i.patient_id = auth.uid()
        or (i.practice_id is not null and public.can_access_practice(i.practice_id))
        or public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

drop policy if exists "Invoice items: write by practice access" on public.invoice_items;
create policy "Invoice items: write by practice access"
on public.invoice_items for all
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        (i.practice_id is not null and public.can_access_practice(i.practice_id))
        or public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
)
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        (i.practice_id is not null and public.can_access_practice(i.practice_id))
        or public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

-- ------------------------------------------------------------
-- RLS: Payments
-- NOTE: Payments should usually be inserted/updated by webhook using service role.
-- We'll allow SELECT for patient/practice; deny normal inserts to avoid spoofing.
-- ------------------------------------------------------------
drop policy if exists "Payments: select by patient or practice access" on public.payments;
create policy "Payments: select by patient or practice access"
on public.payments for select
using (
  patient_id = auth.uid()
  or (practice_id is not null and public.can_access_practice(practice_id))
  or public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Block normal client inserts by not creating an insert policy.
-- Allow super_admin manage for admin repairs.
drop policy if exists "Payments: super admin manage" on public.payments;
create policy "Payments: super admin manage"
on public.payments for all
using (public.has_role(auth.uid(), 'super_admin'::app_role))
with check (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ------------------------------------------------------------
-- Convenience view: patient outstanding balance
-- ------------------------------------------------------------
create or replace view public.patient_balance as
select
  i.patient_id,
  coalesce(sum(case when i.status in ('issued') then i.total_amount else 0 end), 0) as outstanding,
  coalesce(sum(case when i.status in ('paid') then i.total_amount else 0 end), 0) as paid_total,
  count(*) as invoice_count
from public.invoices i
group by i.patient_id;

commit;
