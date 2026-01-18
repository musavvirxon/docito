-- File: supabase/migrations/20260118183000_phase7_staff_dashboard_perf.sql
-- Purpose: Performance + support for real billing/analytics dashboards (idempotent)

-- ----------------------------------------------------------------------------
-- Appointments
-- ----------------------------------------------------------------------------
create index if not exists idx_appointments_practice_created_at
  on public.appointments (practice_id, created_at desc);

create index if not exists idx_appointments_practice_date
  on public.appointments (practice_id, appointment_date desc);

create index if not exists idx_appointments_practice_status
  on public.appointments (practice_id, status);

-- ----------------------------------------------------------------------------
-- Payments (legacy table used by practice analytics)
-- ----------------------------------------------------------------------------
create index if not exists idx_payments_practice_created_at
  on public.payments (practice_id, created_at desc);

create index if not exists idx_payments_practice_status
  on public.payments (practice_id, status);

-- ----------------------------------------------------------------------------
-- Billing transactions (entity-scoped)
-- ----------------------------------------------------------------------------
create index if not exists idx_billing_transactions_entity_status
  on public.billing_transactions (entity_type, entity_id, status, created_at desc);

create index if not exists idx_billing_transactions_entity_type
  on public.billing_transactions (entity_type);
