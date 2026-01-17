-- Path: supabase/migrations/20260117210000_phase7_billing_core.sql
begin;

-- -----------------------------------------------------------------------------
-- Billing core tables (provider-agnostic) + Stripe-compatible fields
-- -----------------------------------------------------------------------------

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text null,
  interval text not null default 'month' check (interval in ('month','year')),
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  is_active boolean not null default true,

  -- Optional provider mapping (Stripe)
  stripe_price_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_plans_active on public.billing_plans (is_active);
create index if not exists idx_billing_plans_price on public.billing_plans (stripe_price_id);

alter table public.billing_plans enable row level security;

drop policy if exists "Billing plans: readable by authenticated" on public.billing_plans;
create policy "Billing plans: readable by authenticated"
on public.billing_plans
for select
using (auth.role() = 'authenticated');


create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text null,

  -- Optional provider mapping (Stripe)
  stripe_customer_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_customers_user on public.billing_customers (user_id);
create index if not exists idx_billing_customers_stripe on public.billing_customers (stripe_customer_id);

alter table public.billing_customers enable row level security;

drop policy if exists "Billing customers: user can read own" on public.billing_customers;
drop policy if exists "Billing customers: user can upsert own" on public.billing_customers;

create policy "Billing customers: user can read own"
on public.billing_customers
for select
using (user_id = auth.uid());

create policy "Billing customers: user can upsert own"
on public.billing_customers
for insert
with check (user_id = auth.uid());

create policy "Billing customers: user can update own"
on public.billing_customers
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());


create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  plan_id uuid not null references public.billing_plans(id),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled','unpaid')),
  started_at timestamptz null,
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,

  -- Optional provider mapping (Stripe)
  stripe_subscription_id text null,
  stripe_price_id text null,
  stripe_customer_id text null,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_billing_subscriptions_entity
on public.billing_subscriptions(entity_type, entity_id);

create index if not exists idx_billing_subscriptions_status on public.billing_subscriptions(status);
create index if not exists idx_billing_subscriptions_plan on public.billing_subscriptions(plan_id);
create index if not exists idx_billing_subscriptions_stripe on public.billing_subscriptions(stripe_subscription_id);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "Billing subscriptions: entity access can read" on public.billing_subscriptions;
drop policy if exists "Billing subscriptions: super admin can manage" on public.billing_subscriptions;

create policy "Billing subscriptions: entity access can read"
on public.billing_subscriptions
for select
using (
  public.has_entity_access(entity_type, entity_id)
  or public.is_super_admin()
);

create policy "Billing subscriptions: super admin can manage"
on public.billing_subscriptions
for all
using (public.is_super_admin())
with check (public.is_super_admin());


create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  subscription_id uuid null references public.billing_subscriptions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','open','paid','void','uncollectible')),
  currency text not null default 'usd',
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  amount_remaining_cents integer not null default 0,

  due_at timestamptz null,
  paid_at timestamptz null,

  -- Optional provider mapping (Stripe)
  stripe_invoice_id text null,
  hosted_invoice_url text null,
  invoice_pdf_url text null,

  line_items jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_invoices_entity on public.billing_invoices(entity_type, entity_id, created_at desc);
create index if not exists idx_billing_invoices_status on public.billing_invoices(status, created_at desc);
create index if not exists idx_billing_invoices_stripe on public.billing_invoices(stripe_invoice_id);

alter table public.billing_invoices enable row level security;

drop policy if exists "Billing invoices: entity access can read" on public.billing_invoices;
drop policy if exists "Billing invoices: super admin can manage" on public.billing_invoices;

create policy "Billing invoices: entity access can read"
on public.billing_invoices
for select
using (
  public.has_entity_access(entity_type, entity_id)
  or public.is_super_admin()
);

create policy "Billing invoices: super admin can manage"
on public.billing_invoices
for all
using (public.is_super_admin())
with check (public.is_super_admin());


create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (entity_type in ('clinic','lab','imaging','pharmacy')),
  entity_id uuid not null,

  invoice_id uuid null references public.billing_invoices(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  transaction_type text not null default 'charge' check (transaction_type in ('charge','refund','adjustment')),
  currency text not null default 'usd',
  amount_cents integer not null default 0,

  provider text not null default 'stripe',
  provider_ref text null, -- payment_intent_id / charge_id / refund_id etc.

  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_billing_transactions_entity on public.billing_transactions(entity_type, entity_id, created_at desc);
create index if not exists idx_billing_transactions_invoice on public.billing_transactions(invoice_id);
create index if not exists idx_billing_transactions_provider_ref on public.billing_transactions(provider_ref);

alter table public.billing_transactions enable row level security;

drop policy if exists "Billing transactions: entity access can read" on public.billing_transactions;
drop policy if exists "Billing transactions: super admin can manage" on public.billing_transactions;

create policy "Billing transactions: entity access can read"
on public.billing_transactions
for select
using (
  public.has_entity_access(entity_type, entity_id)
  or public.is_super_admin()
);

create policy "Billing transactions: super admin can manage"
on public.billing_transactions
for all
using (public.is_super_admin())
with check (public.is_super_admin());


-- -----------------------------------------------------------------------------
-- updated_at triggers (idempotent; uses Phase 5 set_updated_at())
-- -----------------------------------------------------------------------------
drop trigger if exists trg_billing_plans_updated_at on public.billing_plans;
create trigger trg_billing_plans_updated_at
before update on public.billing_plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_billing_customers_updated_at on public.billing_customers;
create trigger trg_billing_customers_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger trg_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_billing_invoices_updated_at on public.billing_invoices;
create trigger trg_billing_invoices_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Seed a few default plans (idempotent)
-- -----------------------------------------------------------------------------
insert into public.billing_plans (code, name, description, interval, amount_cents, currency, is_active)
values
  ('free', 'Free', 'Starter access', 'month', 0, 'usd', true),
  ('pro_monthly', 'Pro (Monthly)', 'Full access billed monthly', 'month', 4900, 'usd', true),
  ('pro_yearly', 'Pro (Yearly)', 'Full access billed yearly', 'year', 49000, 'usd', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  interval = excluded.interval,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- PostgREST schema reload
-- -----------------------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
