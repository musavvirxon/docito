alter table public.billing_transactions

  add column if not exists practice_id uuid,
  add column if not exists user_id uuid,
  add column if not exists description text,

  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists invoice_id uuid,
  add column if not exists transaction_type text,
  add column if not exists amount_cents integer,
  add column if not exists provider text,
  add column if not exists provider_ref text,
  add column if not exists metadata jsonb;

update public.billing_transactions
set
  transaction_type = coalesce(transaction_type, 'charge'),
  provider = coalesce(provider, 'stripe'),
  metadata = coalesce(metadata, '{}'::jsonb)
where
  transaction_type is null
  or provider is null
  or metadata is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'amount'
  ) then
    execute $$
      update public.billing_transactions
      set amount_cents = coalesce(amount_cents, amount)
      where amount_cents is null
    $$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'practice_id'
  ) then
    execute $$
      update public.billing_transactions
      set
        entity_type = coalesce(entity_type, 'clinic'),
        entity_id = coalesce(entity_id, practice_id)
      where (entity_type is null or entity_id is null)
        and practice_id is not null
    $$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'provider_transaction_id'
  ) then
    execute $$
      update public.billing_transactions
      set provider_ref = coalesce(provider_ref, provider_transaction_id)
      where provider_ref is null
        and provider_transaction_id is not null
    $$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_transactions'
      and column_name = 'provider_data'
  ) then
    execute $$
      update public.billing_transactions
      set metadata = coalesce(metadata, '{}'::jsonb) || coalesce(provider_data, '{}'::jsonb)
      where provider_data is not null
    $$;
  end if;
end $$;

-- 7) Helpful indexes for entity-scoped reads
create index if not exists idx_billing_transactions_entity
  on public.billing_transactions (entity_type, entity_id, created_at desc);

create index if not exists idx_billing_transactions_provider_ref
  on public.billing_transactions (provider_ref);

-- 8) Replace get_practice_payments RPC to use billing_transactions consistently.
--    Note: returns dollars as NUMERIC (amount_cents / 100.0).
create or replace function public.get_practice_payments(p_practice_id uuid, p_limit_count integer default 10)
returns table (
  id uuid,
  patient_name text,
  amount numeric,
  status text,
  created_at timestamptz,
  description text
)
language plpgsql
stable
security invoker
as $$
begin
  return query
  select
    bt.id,
    coalesce(pr.full_name, 'Patient') as patient_name,
    (coalesce(bt.amount_cents, 0)::numeric / 100.0) as amount,
    bt.status,
    bt.created_at,
    coalesce(bt.description, bt.metadata->>'description', bt.metadata->>'note', bt.metadata->>'details', '') as description
  from public.billing_transactions bt
  left join public.profiles pr
    on pr.user_id = bt.user_id
  where (bt.entity_type = 'clinic' and bt.entity_id = p_practice_id)
     or (bt.practice_id = p_practice_id)
  order by bt.created_at desc
  limit p_limit_count;
end;
$$;

grant execute on function public.get_practice_payments(uuid, integer) to authenticated;
