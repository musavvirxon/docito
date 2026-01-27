-- Path: supabase/migrations/20260127223000_facility_billing_perf_indexes.sql
begin;

create index if not exists idx_billing_invoices_entity_status_created_at
  on public.billing_invoices (entity_type, entity_id, status, created_at desc);

create index if not exists idx_billing_transactions_entity_status_created_at
  on public.billing_transactions (entity_type, entity_id, status, created_at desc);

commit;
