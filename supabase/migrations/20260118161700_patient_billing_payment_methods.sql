-- File: supabase/migrations/20260118161700_patient_billing_payment_methods.sql
begin;

-- -----------------------------------------------------------------------------
-- Patient billing: store saved payment methods (Stripe PM ids) per user
-- -----------------------------------------------------------------------------

create table if not exists public.user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  provider text not null default 'stripe',
  provider_payment_method_id text not null,

  brand text null,
  last4 text null,
  exp_month int null,
  exp_year int null,

  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_payment_methods_unique unique (user_id, provider, provider_payment_method_id)
);

create index if not exists idx_user_payment_methods_user on public.user_payment_methods(user_id);
create index if not exists idx_user_payment_methods_default on public.user_payment_methods(user_id, is_default);

alter table public.user_payment_methods enable row level security;

-- updated_at trigger (idempotent; set_updated_at exists in repo)
drop trigger if exists trg_user_payment_methods_updated_at on public.user_payment_methods;
create trigger trg_user_payment_methods_updated_at
before update on public.user_payment_methods
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies (idempotent)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_payment_methods'
      and policyname = 'user_payment_methods_select_own'
  ) then
    create policy user_payment_methods_select_own
    on public.user_payment_methods
    for select
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_payment_methods'
      and policyname = 'user_payment_methods_insert_own'
  ) then
    create policy user_payment_methods_insert_own
    on public.user_payment_methods
    for insert
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_payment_methods'
      and policyname = 'user_payment_methods_update_own'
  ) then
    create policy user_payment_methods_update_own
    on public.user_payment_methods
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_payment_methods'
      and policyname = 'user_payment_methods_delete_own'
  ) then
    create policy user_payment_methods_delete_own
    on public.user_payment_methods
    for delete
    using (user_id = auth.uid());
  end if;
end $$;

commit;
