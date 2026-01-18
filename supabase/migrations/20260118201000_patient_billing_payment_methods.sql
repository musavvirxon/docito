-- File: supabase/migrations/20260118201000_patient_billing_payment_methods.sql
-- Purpose: Patient billing payment methods + Stripe customer mapping support (idempotent)

begin;

-- -----------------------------------------------------------------------------
-- Store patient's saved card metadata (non-sensitive) + Stripe payment_method id
-- -----------------------------------------------------------------------------
create table if not exists public.user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'stripe',
  provider_payment_method_id text not null,
  brand text null,
  last4 text null,
  exp_month int null,
  exp_year int null,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, provider, provider_payment_method_id)
);

create index if not exists idx_user_payment_methods_user_default
  on public.user_payment_methods (user_id, is_default);

alter table public.user_payment_methods enable row level security;

drop policy if exists "User payment methods: select own" on public.user_payment_methods;
create policy "User payment methods: select own"
on public.user_payment_methods
for select
using (user_id = auth.uid());

drop policy if exists "User payment methods: insert own" on public.user_payment_methods;
create policy "User payment methods: insert own"
on public.user_payment_methods
for insert
with check (user_id = auth.uid());

drop policy if exists "User payment methods: update own" on public.user_payment_methods;
create policy "User payment methods: update own"
on public.user_payment_methods
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "User payment methods: delete own" on public.user_payment_methods;
create policy "User payment methods: delete own"
on public.user_payment_methods
for delete
using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Helpful performance for patient billing lists
-- -----------------------------------------------------------------------------
create index if not exists idx_invoices_patient_created_at
  on public.invoices (patient_id, created_at desc);

create index if not exists idx_payments_patient_created_at
  on public.payments (patient_id, created_at desc);

commit;
