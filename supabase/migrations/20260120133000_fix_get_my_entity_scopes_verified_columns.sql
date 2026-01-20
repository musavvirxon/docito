-- Path: supabase/migrations/20260120133000_fix_get_my_entity_scopes_verified_columns.sql
-- Fix: get_my_entity_scopes() was referencing practices/pharmacies columns (is_verified/status)
-- but current schemas use (verified/verification_status). This broke access-scope for ALL roles.
-- Idempotent via CREATE OR REPLACE. Uses JSON field access to tolerate future drift.

begin;

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
  -- Helper note:
  -- For some tables we use json field access to avoid hard dependency on specific column names.
  --   verified_bool := coalesce((to_jsonb(t)->>'verified')::boolean, (to_jsonb(t)->>'is_verified')::boolean, false)
  --   status_text   := lower(coalesce(to_jsonb(t)->>'verification_status', to_jsonb(t)->>'status', 'pending'))

  -- ✅ Clinic/Practice admin scope
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce((to_jsonb(p)->>'verified')::boolean, (to_jsonb(p)->>'is_verified')::boolean, false) then 'verified'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'clinic_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'manage_staff', true,
      'view_analytics', true,
      'manage_settings', true,
      'manage_billing', true,
      'view_patients', true,
      'manage_appointments', true
    ) as permissions
  from public.practices p
  where p.admin_id = auth.uid()

  union all

  -- ✅ Clinic staff scope (new)
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce((to_jsonb(p)->>'verified')::boolean, (to_jsonb(p)->>'is_verified')::boolean, false) then 'verified'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    cs.role::text as scope_role,
    false as is_admin,
    coalesce(cs.permissions, '{}'::jsonb) as permissions
  from public.clinic_staff cs
  join public.practices p on p.id = cs.practice_id
  where cs.user_id = auth.uid()
    and cs.status = 'active'

  union all

  -- ✅ Legacy staff scope (practice_staff)
  select
    'clinic'::text as entity_type,
    p.id as entity_id,
    p.name as entity_name,
    case
      when coalesce((to_jsonb(p)->>'verified')::boolean, (to_jsonb(p)->>'is_verified')::boolean, false) then 'verified'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(to_jsonb(p)->>'verification_status', to_jsonb(p)->>'status', 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'clinic_staff'::text as scope_role,
    false as is_admin,
    jsonb_build_object(
      'view_schedule', true,
      'manage_appointments', true,
      'view_patients', true
    ) as permissions
  from public.practice_staff ps
  join public.practices p on p.id = ps.practice_id
  where ps.user_id = auth.uid()
    and ps.status = 'active'

  union all

  -- ✅ Lab admin scope
  select
    'lab'::text as entity_type,
    lc.id as entity_id,
    lc.name as entity_name,
    case
      when lc.is_verified = true then 'verified'
      when lc.status = 'active' then 'active'
      when lc.status = 'suspended' then 'suspended'
      else 'pending'
    end as entity_status,
    'lab_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'manage_staff', true,
      'view_analytics', true,
      'manage_settings', true,
      'manage_billing', true,
      'manage_orders', true
    ) as permissions
  from public.lab_centers lc
  where lc.admin_id = auth.uid()

  union all

  -- ✅ Lab staff scope
  select
    'lab'::text as entity_type,
    lc.id as entity_id,
    lc.name as entity_name,
    case
      when lc.is_verified = true then 'verified'
      when lc.status = 'active' then 'active'
      when lc.status = 'suspended' then 'suspended'
      else 'pending'
    end as entity_status,
    ls.role::text as scope_role,
    false as is_admin,
    coalesce(ls.permissions, '{}'::jsonb) as permissions
  from public.lab_staff ls
  join public.lab_centers lc on lc.id = ls.lab_center_id
  where ls.user_id = auth.uid()
    and ls.status = 'active'

  union all

  -- ✅ Imaging admin scope
  select
    'imaging'::text as entity_type,
    ic.id as entity_id,
    ic.name as entity_name,
    case
      when ic.is_verified = true then 'verified'
      when ic.status = 'active' then 'active'
      when ic.status = 'suspended' then 'suspended'
      else 'pending'
    end as entity_status,
    'imaging_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'manage_staff', true,
      'view_analytics', true,
      'manage_settings', true,
      'manage_billing', true,
      'manage_orders', true,
      'manage_equipment', true
    ) as permissions
  from public.imaging_centers ic
  where ic.admin_id = auth.uid()

  union all

  -- ✅ Imaging staff scope
  select
    'imaging'::text as entity_type,
    ic.id as entity_id,
    ic.name as entity_name,
    case
      when ic.is_verified = true then 'verified'
      when ic.status = 'active' then 'active'
      when ic.status = 'suspended' then 'suspended'
      else 'pending'
    end as entity_status,
    ist.role::text as scope_role,
    false as is_admin,
    coalesce(ist.permissions, '{}'::jsonb) as permissions
  from public.imaging_staff ist
  join public.imaging_centers ic on ic.id = ist.imaging_center_id
  where ist.user_id = auth.uid()
    and ist.status = 'active'

  union all

  -- ✅ Pharmacy admin scope
  select
    'pharmacy'::text as entity_type,
    ph.id as entity_id,
    ph.name as entity_name,
    case
      when coalesce((to_jsonb(ph)->>'verified')::boolean, (to_jsonb(ph)->>'is_verified')::boolean, false) then 'verified'
      when lower(coalesce(to_jsonb(ph)->>'verification_status', to_jsonb(ph)->>'status', 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(to_jsonb(ph)->>'verification_status', to_jsonb(ph)->>'status', 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    'pharmacy_admin'::text as scope_role,
    true as is_admin,
    jsonb_build_object(
      'manage_staff', true,
      'view_analytics', true,
      'manage_settings', true,
      'manage_billing', true,
      'manage_orders', true,
      'manage_inventory', true
    ) as permissions
  from public.pharmacies ph
  where ph.admin_id = auth.uid()

  union all

  -- ✅ Pharmacy staff scope
  select
    'pharmacy'::text as entity_type,
    ph.id as entity_id,
    ph.name as entity_name,
    case
      when coalesce((to_jsonb(ph)->>'verified')::boolean, (to_jsonb(ph)->>'is_verified')::boolean, false) then 'verified'
      when lower(coalesce(to_jsonb(ph)->>'verification_status', to_jsonb(ph)->>'status', 'pending')) = 'suspended' then 'suspended'
      when lower(coalesce(to_jsonb(ph)->>'verification_status', to_jsonb(ph)->>'status', 'pending')) = 'active' then 'active'
      else 'pending'
    end as entity_status,
    pst.role::text as scope_role,
    false as is_admin,
    coalesce(pst.permissions, '{}'::jsonb) as permissions
  from public.pharmacy_staff pst
  join public.pharmacies ph on ph.id = pst.pharmacy_id
  where pst.user_id = auth.uid()
    and pst.status = 'active'
$$;

grant execute on function public.get_my_entity_scopes() to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
