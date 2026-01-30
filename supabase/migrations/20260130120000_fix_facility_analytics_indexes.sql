-- Path: supabase/migrations/20260130120000_fix_facility_analytics_indexes.sql
begin;

-- -----------------------------------------------------------------------------
-- Performance + correctness helpers for billing & analytics lookups
-- Idempotent: uses IF NOT EXISTS everywhere.
-- -----------------------------------------------------------------------------

-- Referrals: receiver lookups + time filtering
create index if not exists idx_referrals_receiver_entity_created_at
  on public.referrals (receiver_entity_type, receiver_entity_id, created_at desc);

create index if not exists idx_referrals_receiver_entity_status
  on public.referrals (receiver_entity_type, receiver_entity_id, status);

-- Referral updates (turnaround calculations) if table exists
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'referral_updates'
  ) then
    execute 'create index if not exists idx_referral_updates_referral_created_at
             on public.referral_updates (referral_id, created_at desc)';
  end if;
end $$;

-- Billing transactions: entity lookups + time filtering
create index if not exists idx_billing_transactions_entity_created_at
  on public.billing_transactions (entity_type, entity_id, created_at desc);

commit;
