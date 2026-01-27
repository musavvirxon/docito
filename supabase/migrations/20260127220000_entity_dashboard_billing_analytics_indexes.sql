-- Path: supabase/migrations/20260127220000_entity_dashboard_billing_analytics_indexes.sql

begin;

-- Billing: improve entity billing lookups
create index if not exists idx_billing_invoices_entity_status_created
  on public.billing_invoices (entity_type, entity_id, status, created_at desc);

create index if not exists idx_billing_transactions_entity_status_created
  on public.billing_transactions (entity_type, entity_id, status, created_at desc);

-- Analytics: improve facility analytics lookups (non-clinic entities)
create index if not exists idx_referrals_receiver_entity_created
  on public.referrals (receiver_entity_type, receiver_entity_id, created_at desc);

commit;
