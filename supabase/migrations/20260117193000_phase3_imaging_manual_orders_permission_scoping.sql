-- File: supabase/migrations/20260117193000_phase3_imaging_manual_orders_permission_scoping.sql
-- Phase 3: Manual imaging order creation + strict permission scoping (idempotent)

begin;

-- -----------------------------------------------------------------------------
-- Referrals (imaging receiver): require can_view_orders to SELECT as imaging_staff
-- -----------------------------------------------------------------------------
alter table if exists public.referrals enable row level security;

drop policy if exists "Referrals: imaging receiver entity can view" on public.referrals;

create policy "Referrals: imaging receiver entity can view"
on public.referrals
for select
using (
  receiver_type = 'imaging_center'
  and (
    exists (
      select 1
      from public.imaging_centers ic
      where ic.id = receiver_entity_id
        and ic.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.imaging_staff isf
      where isf.imaging_center_id = receiver_entity_id
        and isf.user_id = auth.uid()
        and isf.status = 'active'
        and coalesce(isf.can_view_orders, false) = true
    )
  )
);

-- -----------------------------------------------------------------------------
-- Referrals (imaging receiver): UPDATE only if staff has workflow/report permissions
-- -----------------------------------------------------------------------------
drop policy if exists "Imaging staff can update imaging referrals" on public.referrals;

create policy "Imaging staff can update imaging referrals"
on public.referrals
for update
using (
  receiver_type = 'imaging_center'
  and exists (
    select 1
    from public.imaging_staff isf
    where isf.user_id = auth.uid()
      and isf.status = 'active'
      and isf.imaging_center_id = receiver_entity_id
      and (
        coalesce(isf.can_process_scans, false) = true
        or coalesce(isf.can_upload_results, false) = true
        or coalesce(isf.can_verify_results, false) = true
      )
  )
)
with check (true);

-- -----------------------------------------------------------------------------
-- imaging_order_state: permission-aware policies
-- -----------------------------------------------------------------------------
alter table if exists public.imaging_order_state enable row level security;

drop policy if exists "Imaging order state: select by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: manage by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: insert by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: update by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: delete by center staff/admin" on public.imaging_order_state;

create policy "Imaging order state: select by center staff/admin"
on public.imaging_order_state
for select
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
      and coalesce(s.can_view_orders, false) = true
  )
);

create policy "Imaging order state: insert by center admin or scan staff"
on public.imaging_order_state
for insert
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
      and coalesce(s.can_process_scans, false) = true
  )
);

create policy "Imaging order state: update by center admin or scan staff"
on public.imaging_order_state
for update
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
      and coalesce(s.can_process_scans, false) = true
  )
)
with check (true);

create policy "Imaging order state: delete by center admin"
on public.imaging_order_state
for delete
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_order_state.imaging_center_id
      and ic.admin_id = auth.uid()
  )
);

-- Reload PostgREST schema cache
select pg_notify('pgrst', 'reload schema');

commit;
