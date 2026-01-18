-- supabase/migrations/20260118110000_phase4_imaging_manual_order_admin_rls.sql
-- Phase 4: Imaging manual order creation (admin + permitted staff) RLS hardening + policies (idempotent)

begin;

-- -----------------------------------------------------------------------------
-- 1) imaging_order_state: allow admin OR staff with can_view_orders OR can_process_scans
-- -----------------------------------------------------------------------------
alter table if exists public.imaging_order_state enable row level security;

drop policy if exists "Imaging order state: select by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: insert by center admin or scan staff" on public.imaging_order_state;
drop policy if exists "Imaging order state: update by center admin or scan staff" on public.imaging_order_state;
drop policy if exists "Imaging order state: delete by center admin" on public.imaging_order_state;

create policy "Imaging order state: select by center staff/admin"
on public.imaging_order_state
for select
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and (
        coalesce(s.can_view_orders, false) = true
        or coalesce(s.can_process_scans, false) = true
      )
  )
);

create policy "Imaging order state: insert by center admin or permitted staff"
on public.imaging_order_state
for insert
to authenticated
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and (
        coalesce(s.can_view_orders, false) = true
        or coalesce(s.can_process_scans, false) = true
      )
  )
);

create policy "Imaging order state: update by center admin or permitted staff"
on public.imaging_order_state
for update
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and (
        coalesce(s.can_view_orders, false) = true
        or coalesce(s.can_process_scans, false) = true
      )
  )
)
with check (true);

create policy "Imaging order state: delete by center admin"
on public.imaging_order_state
for delete
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 2) referrals: allow imaging_staff (can_view_orders) to create *manual* imaging referrals
--    (keeps existing "Imaging admins can create referrals (referrer)" policy intact)
-- -----------------------------------------------------------------------------
alter table if exists public.referrals enable row level security;

drop policy if exists "Imaging staff can create referrals (manual imaging order)" on public.referrals;

create policy "Imaging staff can create referrals (manual imaging order)"
on public.referrals
for insert
to authenticated
with check (
  referrer_type = 'imaging_center'
  and receiver_type = 'imaging_center'
  and referrer_user_id = auth.uid()
  and referrer_entity_id = receiver_entity_id
  and coalesce(facility_patient_id, null) is not null
  and exists (
    select 1
    from public.imaging_staff isf
    where isf.user_id = auth.uid()
      and isf.status = 'active'
      and isf.imaging_center_id = receiver_entity_id
      and coalesce(isf.can_view_orders, false) = true
  )
);

-- Reload PostgREST schema cache
select pg_notify('pgrst', 'reload schema');

commit;
