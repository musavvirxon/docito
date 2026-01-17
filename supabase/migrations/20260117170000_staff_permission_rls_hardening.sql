-- File: supabase/migrations/20260117170000_staff_permission_rls_hardening.sql
-- Purpose: Ensure invited staff can ONLY view/manage data for the entity they belong to AND only within granted permissions.
-- Idempotent: Uses DROP POLICY IF EXISTS / CREATE POLICY and avoids non-idempotent DDL.

begin;

-- =========================================================
-- LAB: tighten staff permissions on orders/items/results
-- =========================================================

alter table if exists public.test_orders enable row level security;

drop policy if exists "Lab staff can view and update their lab orders" on public.test_orders;
drop policy if exists "Lab staff can view lab orders" on public.test_orders;
drop policy if exists "Lab staff can update lab orders" on public.test_orders;

create policy "Lab staff can view lab orders"
on public.test_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.lab_staff ls
    where ls.lab_center_id = test_orders.lab_center_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
  )
);

create policy "Lab staff can update lab orders"
on public.test_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.lab_staff ls
    where ls.lab_center_id = test_orders.lab_center_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
)
with check (
  exists (
    select 1
    from public.lab_staff ls
    where ls.lab_center_id = test_orders.lab_center_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
);

alter table if exists public.test_order_items enable row level security;

drop policy if exists "Lab staff can manage test order items" on public.test_order_items;
drop policy if exists "Lab staff can insert test order items" on public.test_order_items;
drop policy if exists "Lab staff can update test order items" on public.test_order_items;
drop policy if exists "Lab staff can delete test order items" on public.test_order_items;

create policy "Lab staff can insert test order items"
on public.test_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_orders t
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where t.id = test_order_items.test_order_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
);

create policy "Lab staff can update test order items"
on public.test_order_items
for update
to authenticated
using (
  exists (
    select 1
    from public.test_orders t
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where t.id = test_order_items.test_order_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
)
with check (
  exists (
    select 1
    from public.test_orders t
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where t.id = test_order_items.test_order_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
);

create policy "Lab staff can delete test order items"
on public.test_order_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.test_orders t
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where t.id = test_order_items.test_order_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and ls.can_process_samples = true
  )
);

alter table if exists public.test_results enable row level security;

drop policy if exists "Lab staff can manage results" on public.test_results;
drop policy if exists "Lab staff can insert results" on public.test_results;
drop policy if exists "Lab staff can update results" on public.test_results;
drop policy if exists "Lab staff can delete results" on public.test_results;

create policy "Lab staff can insert results"
on public.test_results
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_order_items toi
    join public.test_orders t on t.id = toi.test_order_id
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where toi.id = test_results.test_order_item_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and (ls.can_upload_results = true or ls.can_verify_results = true)
  )
);

create policy "Lab staff can update results"
on public.test_results
for update
to authenticated
using (
  exists (
    select 1
    from public.test_order_items toi
    join public.test_orders t on t.id = toi.test_order_id
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where toi.id = test_results.test_order_item_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and (ls.can_upload_results = true or ls.can_verify_results = true)
  )
)
with check (
  exists (
    select 1
    from public.test_order_items toi
    join public.test_orders t on t.id = toi.test_order_id
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where toi.id = test_results.test_order_item_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and (ls.can_upload_results = true or ls.can_verify_results = true)
  )
);

create policy "Lab staff can delete results"
on public.test_results
for delete
to authenticated
using (
  exists (
    select 1
    from public.test_order_items toi
    join public.test_orders t on t.id = toi.test_order_id
    join public.lab_staff ls on ls.lab_center_id = t.lab_center_id
    where toi.id = test_results.test_order_item_id
      and ls.user_id = auth.uid()
      and ls.status = 'active'
      and (ls.can_upload_results = true or ls.can_verify_results = true)
  )
);

-- =========================================================
-- IMAGING: enforce staff permission flags for ops
-- =========================================================

alter table if exists public.imaging_order_state enable row level security;

drop policy if exists "Imaging order state: select by center staff/admin" on public.imaging_order_state;
drop policy if exists "Imaging order state: manage by center staff/admin" on public.imaging_order_state;

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
      and s.can_view_orders = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

create policy "Imaging order state: manage by center admin or scan staff"
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
      and s.can_process_scans = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

create policy "Imaging order state: update by center admin or scan staff"
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
      and s.can_process_scans = true
  )
  or public.has_role(auth.uid(), 'super_admin')
)
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
      and s.can_process_scans = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

create policy "Imaging order state: delete by center admin or scan staff"
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
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_order_state.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.can_process_scans = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

alter table if exists public.imaging_equipment enable row level security;

drop policy if exists "Imaging equipment: manage by center admin" on public.imaging_equipment;
drop policy if exists "Imaging equipment: manage by center admin or equipment staff" on public.imaging_equipment;

create policy "Imaging equipment: manage by center admin or equipment staff"
on public.imaging_equipment
for all
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.can_manage_equipment = true
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_equipment.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_equipment.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.can_manage_equipment = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

alter table if exists public.imaging_reports enable row level security;

drop policy if exists "Imaging reports: select by center staff/admin" on public.imaging_reports;
drop policy if exists "Imaging reports: manage by center staff/admin" on public.imaging_reports;

create policy "Imaging reports: select by center staff/admin"
on public.imaging_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.can_view_orders = true
  )
  or public.has_role(auth.uid(), 'super_admin')
);

create policy "Imaging reports: manage by center admin or results staff"
on public.imaging_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and (s.can_upload_results = true or s.can_verify_results = true)
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1
    from public.imaging_centers ic
    where ic.id = imaging_reports.imaging_center_id
      and ic.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.imaging_staff s
    where s.imaging_center_id = imaging_reports.imaging_center_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and (s.can_upload_results = true or s.can_verify_results = true)
  )
  or public.has_role(auth.uid(), 'super_admin')
);

-- =========================================================
-- PHARMACY: restrict fulfillment orders management by permissions
-- =========================================================

alter table if exists public.fulfillment_orders enable row level security;

drop policy if exists "Pharmacy staff can manage fulfillment orders" on public.fulfillment_orders;
drop policy if exists "Pharmacy staff can view fulfillment orders" on public.fulfillment_orders;
drop policy if exists "Pharmacy dispensing staff can manage fulfillment orders" on public.fulfillment_orders;
drop policy if exists "Pharmacy admins can manage fulfillment orders" on public.fulfillment_orders;

create policy "Pharmacy staff can view fulfillment orders"
on public.fulfillment_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.pharmacy_staff ps
    where ps.pharmacy_id = fulfillment_orders.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
  )
);

create policy "Pharmacy admins can manage fulfillment orders"
on public.fulfillment_orders
for all
to authenticated
using (
  exists (
    select 1
    from public.pharmacies p
    where p.id = fulfillment_orders.pharmacy_id
      and p.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1
    from public.pharmacies p
    where p.id = fulfillment_orders.pharmacy_id
      and p.admin_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'super_admin')
);

create policy "Pharmacy dispensing staff can manage fulfillment orders"
on public.fulfillment_orders
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pharmacy_staff ps
    where ps.pharmacy_id = fulfillment_orders.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and (ps.can_dispense = true or ps.can_process_prescriptions = true)
  )
);

create policy "Pharmacy dispensing staff can update fulfillment orders"
on public.fulfillment_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.pharmacy_staff ps
    where ps.pharmacy_id = fulfillment_orders.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and (ps.can_dispense = true or ps.can_process_prescriptions = true)
  )
)
with check (
  exists (
    select 1
    from public.pharmacy_staff ps
    where ps.pharmacy_id = fulfillment_orders.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and (ps.can_dispense = true or ps.can_process_prescriptions = true)
  )
);

create policy "Pharmacy dispensing staff can delete fulfillment orders"
on public.fulfillment_orders
for delete
to authenticated
using (
  exists (
    select 1
    from public.pharmacy_staff ps
    where ps.pharmacy_id = fulfillment_orders.pharmacy_id
      and ps.user_id = auth.uid()
      and ps.status = 'active'
      and (ps.can_dispense = true or ps.can_process_prescriptions = true)
  )
);

-- Reload schema for PostgREST (helps Supabase client + Lovable dev)
select pg_notify('pgrst', 'reload schema');

commit;
