begin;

create index if not exists idx_billing_transactions_entity_created_at
  on public.billing_transactions (entity_type, entity_id, created_at desc);

create index if not exists idx_billing_transactions_entity_status_created_at
  on public.billing_transactions (entity_type, entity_id, status, created_at desc);

create index if not exists idx_appointments_practice_appointment_date
  on public.appointments (practice_id, appointment_date);

create index if not exists idx_appointments_practice_created_at
  on public.appointments (practice_id, created_at desc);

commit;
