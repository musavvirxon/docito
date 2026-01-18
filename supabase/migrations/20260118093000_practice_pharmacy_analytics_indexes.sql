-- File: supabase/migrations/20260118093000_practice_pharmacy_analytics_indexes.sql
begin;

-- ============================================================
-- Phase 5: Practice + Pharmacy analytics support
-- Idempotent indexes for dashboard aggregation queries
-- ============================================================

-- Pharmacy analytics (orders + prescription joins)
create index if not exists idx_fulfillment_orders_pharmacy_created_at
  on public.fulfillment_orders (pharmacy_id, created_at);

create index if not exists idx_fulfillment_orders_pharmacy_status
  on public.fulfillment_orders (pharmacy_id, status);

create index if not exists idx_prescriptions_pharmacy_id
  on public.prescriptions (pharmacy_id);

create index if not exists idx_prescriptions_pharmacy_created_at
  on public.prescriptions (pharmacy_id, created_at);

create index if not exists idx_prescription_items_prescription_id
  on public.prescription_items (prescription_id);

-- Practice analytics (booking trends + lead time)
create index if not exists idx_appointments_practice_created_at
  on public.appointments (practice_id, created_at);

create index if not exists idx_appointments_practice_date
  on public.appointments (practice_id, appointment_date);

commit;
