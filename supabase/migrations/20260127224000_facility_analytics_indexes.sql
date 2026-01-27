-- Path: supabase/migrations/20260127224000_facility_analytics_indexes.sql
begin;

create index if not exists idx_referrals_receiver_entity_status_created_at
  on public.referrals (receiver_entity_type, receiver_entity_id, status, created_at desc);

commit;
