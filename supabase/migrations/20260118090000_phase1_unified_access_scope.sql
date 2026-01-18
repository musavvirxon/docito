-- Path: supabase/migrations/20260118090000_phase1_unified_access_scope.sql
-- Phase 1: Unified access model (clinic/lab/imaging/pharmacy) + staff-scoped access helpers
-- Idempotent: CREATE OR REPLACE, DROP POLICY IF EXISTS, CREATE POLICY, CREATE VIEW IF NOT EXISTS pattern.
begin;

-- -------------------------------------------------------------------
-- 1) Unify clinic access: include BOTH clinic_staff and legacy practice_staff
-- -------------------------------------------------------------------
create or replace function public.can_access_practice(p_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.practices p
      where p.id = p_practice_id
        and p.admin_id = auth.uid()
    )
    or exists (
      select 1
      from public.clinic_staff cs
      where cs.practice_id = p_practice_id
        and cs.user_id = auth.uid()
        and coalesce(cs.status, 'active') = 'active'
    )
    or exists (
      select 1
      from public.practice_staff ps
      where ps.practice_id = p_practice_id
        and ps.user_id = auth.uid()
        and coalesce(ps.status, 'active') = 'active'
    )
    or public.has_role(auth.uid(), 'super_admin');
$$;

grant execute on function public.can_access_practice(uuid) to authenticated;

-- -------------------------------------------------------------------
-- 2) Unified entity access (used by Edge Functions + future RLS)
--    entity_type: 'clinic' | 'practice' | 'lab' | 'imaging' | 'pharmacy'
-- -------------------------------------------------------------------
create or replace function public.can_access_entity(p_entity_type text, p_entity_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  et text := lower(coalesce(p_entity_type, ''));
begin
  if et in ('clinic','practice') then
    return public.can_access_practice(p_entity_id);
  end if;

  if et = 'lab' then
    return
      exists (
        select 1
        from public.lab_centers lc
        where lc.id = p_entity_id
          and lc.admin_id = auth.uid()
      )
      or exists (
        select 1
        from public.lab_staff ls
        where ls.lab_center_id = p_entity_id
          and ls.user_id = auth.uid()
          and coalesce(ls.status, 'active') = 'active'
      )
      or public.has_role(auth.uid(), 'super_admin');
  end if;

  if et = 'imaging' then
    return
      exists (
        select 1
        from public.imaging_centers ic
        where ic.id = p_entity_id
          and ic.admin_id = auth.uid()
      )
      or exists (
        select 1
        from public.imaging_staff s
        where s.imaging_center_id = p_entity_id
          and s.user_id = auth.uid()
          and coalesce(s.status, 'active') = 'active'
      )
      or public.has_role(auth.uid(), 'super_admin');
  end if;

  if et = 'pharmacy' then
    return
      exists (
        select 1
        from public.pharmacies p
        where p.id = p_entity_id
          and p.admin_id = auth.uid()
      )
      or exists (
        select 1
        from public.pharmacy_staff ps
        where ps.pharmacy_id = p_entity_id
          and ps.user_id = auth.uid()
          and coalesce(ps.status, 'active') = 'active'
      )
      or public.has_role(auth.uid(), 'super_admin');
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_entity(text, uuid) to authenticated;

-- -------------------------------------------------------------------
-- 3) Primary scopes feed for frontend + Edge Functions (single source of truth)
--    Returns ALL scopes user belongs to (admins + invited staff)
-- -------------------------------------------------------------------
create or replace function public.get_my_entity_scopes()
returns table (
  entity_type text,
  entity_id uuid,
  entity_name text,
  entity_status text,
  scope_role text,
  is_admin boolean,
  permissions jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  -- Clinic/Practice admin scope
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce(p.is_verified, false) then 'verified'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'suspended' then 'suspended'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'clinic_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'practice_id', p.id,
      'can_book_appointments', true,
      'can_view_medical_records', true,
      'can_manage_billing', true,
      'can_manage_patients', true,
      'can_view_schedule', true
    ) as permissions
  from public.practices p
  where p.admin_id = auth.uid()

  union all

  -- Clinic staff scope (new)
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce(p.is_verified, false) then 'verified'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'suspended' then 'suspended'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    coalesce(cs.staff_role, 'clinic_staff')::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'practice_id', cs.practice_id,
      'staff_role', cs.staff_role,
      'can_book_appointments', coalesce(cs.can_book_appointments, false),
      'can_view_medical_records', coalesce(cs.can_view_medical_records, false),
      'can_manage_billing', coalesce(cs.can_manage_billing, false),
      'can_manage_patients', coalesce(cs.can_manage_patients, false),
      'can_view_schedule', coalesce(cs.can_view_schedule, true),
      'status', cs.status
    ) as permissions
  from public.clinic_staff cs
  join public.practices p on p.id = cs.practice_id
  where cs.user_id = auth.uid()
    and coalesce(cs.status, 'active') = 'active'

  union all

  -- Legacy practice_staff scope (older table)
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce(p.is_verified, false) then 'verified'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'suspended' then 'suspended'
      when lower(coalesce(p.status::text, coalesce(p.verification_status::text, 'pending'))) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    coalesce(ps.role, 'practice_staff')::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'practice_id', ps.practice_id,
      'role', ps.role,
      'department', ps.department,
      'status', ps.status
    ) as permissions
  from public.practice_staff ps
  join public.practices p on p.id = ps.practice_id
  where ps.user_id = auth.uid()
    and coalesce(ps.status, 'active') = 'active'

  union all

  -- Lab admin scope
  select
    'lab'::text as entity_type,
    lc.id as entity_id,
    lc.name as entity_name,
    case
      when coalesce(lc.is_verified, false) then 'verified'
      when lower(coalesce(lc.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(lc.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'lab_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'lab_center_id', lc.id,
      'can_process_samples', true,
      'can_upload_results', true,
      'can_verify_results', true,
      'can_manage_equipment', true
    ) as permissions
  from public.lab_centers lc
  where lc.admin_id = auth.uid()

  union all

  -- Lab staff scope
  select
    'lab'::text as entity_type,
    lc.id as entity_id,
    lc.name as entity_name,
    case
      when coalesce(lc.is_verified, false) then 'verified'
      when lower(coalesce(lc.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(lc.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    coalesce(ls.staff_role, 'lab_staff')::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'lab_center_id', ls.lab_center_id,
      'staff_role', ls.staff_role,
      'can_process_samples', coalesce(ls.can_process_samples, false),
      'can_upload_results', coalesce(ls.can_upload_results, false),
      'can_verify_results', coalesce(ls.can_verify_results, false),
      'can_manage_equipment', coalesce(ls.can_manage_equipment, false),
      'status', ls.status
    ) as permissions
  from public.lab_staff ls
  join public.lab_centers lc on lc.id = ls.lab_center_id
  where ls.user_id = auth.uid()
    and coalesce(ls.status, 'active') = 'active'

  union all

  -- Imaging admin scope
  select
    'imaging'::text as entity_type,
    ic.id as entity_id,
    ic.name as entity_name,
    case
      when coalesce(ic.is_verified, false) then 'verified'
      when lower(coalesce(ic.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(ic.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'imaging_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'imaging_center_id', ic.id,
      'can_view_orders', true,
      'can_process_scans', true,
      'can_upload_results', true,
      'can_verify_results', true,
      'can_manage_equipment', true
    ) as permissions
  from public.imaging_centers ic
  where ic.admin_id = auth.uid()

  union all

  -- Imaging staff scope
  select
    'imaging'::text as entity_type,
    ic.id as entity_id,
    ic.name as entity_name,
    case
      when coalesce(ic.is_verified, false) then 'verified'
      when lower(coalesce(ic.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(ic.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    coalesce(s.staff_role, 'imaging_staff')::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'imaging_center_id', s.imaging_center_id,
      'staff_role', s.staff_role,
      'can_view_orders', coalesce(s.can_view_orders, true),
      'can_process_scans', coalesce(s.can_process_scans, false),
      'can_upload_results', coalesce(s.can_upload_results, false),
      'can_verify_results', coalesce(s.can_verify_results, false),
      'can_manage_equipment', coalesce(s.can_manage_equipment, false),
      'status', s.status
    ) as permissions
  from public.imaging_staff s
  join public.imaging_centers ic on ic.id = s.imaging_center_id
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') = 'active'

  union all

  -- Pharmacy admin scope
  select
    'pharmacy'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce(p.is_verified, false) then 'verified'
      when lower(coalesce(p.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(p.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'pharmacy_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'pharmacy_id', p.id,
      'can_dispense', true,
      'can_process_prescriptions', true,
      'can_manage_inventory', true,
      'can_manage_billing', true
    ) as permissions
  from public.pharmacies p
  where p.admin_id = auth.uid()

  union all

  -- Pharmacy staff scope
  select
    'pharmacy'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce(p.is_verified, false) then 'verified'
      when lower(coalesce(p.status, 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(p.status, 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    coalesce(ps.staff_role, 'pharmacy_staff')::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'pharmacy_id', ps.pharmacy_id,
      'staff_role', ps.staff_role,
      'can_dispense', coalesce(ps.can_dispense, false),
      'can_process_prescriptions', coalesce(ps.can_process_prescriptions, false),
      'can_manage_inventory', coalesce(ps.can_manage_inventory, false),
      'can_manage_billing', coalesce(ps.can_manage_billing, false),
      'status', ps.status
    ) as permissions
  from public.pharmacy_staff ps
  join public.pharmacies p on p.id = ps.pharmacy_id
  where ps.user_id = auth.uid()
    and coalesce(ps.status, 'active') = 'active'
$$;

grant execute on function public.get_my_entity_scopes() to authenticated;

-- -------------------------------------------------------------------
-- 4) Fix legacy practice_staff: allow staff to read their own row (if user_id set)
-- -------------------------------------------------------------------
alter table if exists public.practice_staff enable row level security;

drop policy if exists "Practice staff can view their own record" on public.practice_staff;
create policy "Practice staff can view their own record"
on public.practice_staff
for select
to authenticated
using (user_id = auth.uid());

-- Keep existing admin policies intact (do NOT drop them here).

-- -------------------------------------------------------------------
-- 5) PostgREST reload (helps Lovable dev)
-- -------------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');

commit;
