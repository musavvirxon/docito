-- File: supabase/migrations/20260118093000_phase9_realtime_dashboards.sql

begin;

-- ============================================================
-- Phase 9: Realtime support for dashboards + topbar
-- Adds key operational tables to supabase_realtime publication
-- and sets REPLICA IDENTITY FULL for richer payloads.
-- Idempotent & safe if tables already added.
-- ============================================================

do $$
begin
  -- Helper: set replica identity full if table exists
  begin
    execute 'alter table public.practices replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.lab_centers replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.imaging_centers replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.pharmacies replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.referrals replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.test_orders replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.prescriptions replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.fulfillment_orders replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.pharmacy_inventory replica identity full';
  exception when undefined_table then null;
  end;

  begin
    execute 'alter table public.billing_transactions replica identity full';
  exception when undefined_table then null;
  end;

  -- Add tables to supabase_realtime publication (ignore if already present)
  begin
    execute 'alter publication supabase_realtime add table public.practices';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.lab_centers';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.imaging_centers';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.pharmacies';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.referrals';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.test_orders';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.prescriptions';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.fulfillment_orders';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.pharmacy_inventory';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.billing_transactions';
  exception when duplicate_object then null;
          when undefined_object then null;
          when undefined_table then null;
  end;
end $$;

commit;
