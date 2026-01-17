-- Path: supabase/migrations/20260117220000_phase9_realtime_notifications.sql
begin;

-- -----------------------------------------------------------------------------
-- Realtime: ensure tables are in publication for realtime
-- (Supabase uses "supabase_realtime" publication; adding is idempotent)
-- -----------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.imaging_order_state;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.referrals;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.fulfillment_orders;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.verification_submissions;
  exception when duplicate_object then
    null;
  end;
end $$;

-- -----------------------------------------------------------------------------
-- Recommended: Realtime only works safely when RLS is enabled (it is),
-- so we do NOT loosen any policies here.
-- -----------------------------------------------------------------------------

select pg_notify('pgrst', 'reload schema');

commit;
