-- File: supabase/migrations/20260117190000_access_scope_foundation.sql
-- Phase 1: Canonical access scope resolver for staff dashboards (idempotent)

begin;

-- Ensure RLS helpers exist in search_path usage
-- (has_role already exists in this repo; we just rely on it.)

-- 1) A stable, canonical scope resolver.
-- Returns ONE active assignment (priority: clinic, lab, imaging, pharmacy) for the current auth user.
-- If user is an entity admin (admin_id on entity table), returns admin scope with full permissions for that entity.
create or replace function public.get_my_access_scope()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();

  -- clinic
  cs record;
  pr record;

  -- lab
  ls record;
  lc record;

  -- imaging
  isf record;
  ic record;

  -- pharmacy
  ps record;
  ph record;

begin
  if uid is null then
    return jsonb_build_object(
      'entity_type', 'none',
      'entity_id', null,
      'staff_role', null,
      'status', 'none',
      'permissions', jsonb_build_object()
    );
  end if;

  -- ---- Clinic admin scope (practice admin_id)
  select p.* into pr
  from public.practices p
  where p.admin_id = uid
  order by p.created_at desc nulls last
  limit 1;

  if pr.id is not null then
    return jsonb_build_object(
      'entity_type', 'clinic',
      'entity_id', pr.id,
      'staff_role', 'clinic_admin',
      'status', 'active',
      'permissions', jsonb_build_object(
        'can_book_appointments', true,
        'can_view_medical_records', true,
        'can_manage_billing', true,
        'can_manage_patients', true,
        'can_view_schedule', true
      )
    );
  end if;

  -- ---- Clinic staff scope
  select * into cs
  from public.clinic_staff
  where user_id = uid
    and status = 'active'
  order by created_at desc nulls last
  limit 1;

  if cs.practice_id is not null then
    return jsonb_build_object(
      'entity_type', 'clinic',
      'entity_id', cs.practice_id,
      'staff_role', coalesce(cs.staff_role, 'clinic_staff'),
      'status', cs.status,
      'permissions', jsonb_build_object(
        'can_book_appointments', coalesce(cs.can_book_appointments, false),
        'can_view_medical_records', coalesce(cs.can_view_medical_records, false),
        'can_manage_billing', coalesce(cs.can_manage_billing, false),
        'can_manage_patients', coalesce(cs.can_manage_patients, false),
        'can_view_schedule', coalesce(cs.can_view_schedule, false)
      )
    );
  end if;

  -- ---- Lab admin scope
  select lc2.* into lc
  from public.lab_centers lc2
  where lc2.admin_id = uid
  order by lc2.created_at desc nulls last
  limit 1;

  if lc.id is not null then
    return jsonb_build_object(
      'entity_type', 'lab',
      'entity_id', lc.id,
      'staff_role', 'lab_admin',
      'status', 'active',
      'permissions', jsonb_build_object(
        'can_process_samples', true,
        'can_upload_results', true,
        'can_verify_results', true,
        'can_manage_equipment', true
      )
    );
  end if;

  -- ---- Lab staff scope
  select * into ls
  from public.lab_staff
  where user_id = uid
    and status = 'active'
  order by created_at desc nulls last
  limit 1;

  if ls.lab_center_id is not null then
    return jsonb_build_object(
      'entity_type', 'lab',
      'entity_id', ls.lab_center_id,
      'staff_role', coalesce(ls.staff_role, 'lab_staff'),
      'status', ls.status,
      'permissions', jsonb_build_object(
        'can_process_samples', coalesce(ls.can_process_samples, false),
        'can_upload_results', coalesce(ls.can_upload_results, false),
        'can_verify_results', coalesce(ls.can_verify_results, false),
        'can_manage_equipment', coalesce(ls.can_manage_equipment, false)
      )
    );
  end if;

  -- ---- Imaging admin scope
  select ic2.* into ic
  from public.imaging_centers ic2
  where ic2.admin_id = uid
  order by ic2.created_at desc nulls last
  limit 1;

  if ic.id is not null then
    return jsonb_build_object(
      'entity_type', 'imaging',
      'entity_id', ic.id,
      'staff_role', 'imaging_admin',
      'status', 'active',
      'permissions', jsonb_build_object(
        'can_view_orders', true,
        'can_process_scans', true,
        'can_upload_results', true,
        'can_verify_results', true,
        'can_manage_equipment', true
      )
    );
  end if;

  -- ---- Imaging staff scope
  select * into isf
  from public.imaging_staff
  where user_id = uid
    and status = 'active'
  order by created_at desc nulls last
  limit 1;

  if isf.imaging_center_id is not null then
    return jsonb_build_object(
      'entity_type', 'imaging',
      'entity_id', isf.imaging_center_id,
      'staff_role', coalesce(isf.staff_role, 'imaging_staff'),
      'status', isf.status,
      'permissions', jsonb_build_object(
        'can_view_orders', coalesce(isf.can_view_orders, false),
        'can_process_scans', coalesce(isf.can_process_scans, false),
        'can_upload_results', coalesce(isf.can_upload_results, false),
        'can_verify_results', coalesce(isf.can_verify_results, false),
        'can_manage_equipment', coalesce(isf.can_manage_equipment, false)
      )
    );
  end if;

  -- ---- Pharmacy admin scope
  select ph2.* into ph
  from public.pharmacies ph2
  where ph2.admin_id = uid
  order by ph2.created_at desc nulls last
  limit 1;

  if ph.id is not null then
    return jsonb_build_object(
      'entity_type', 'pharmacy',
      'entity_id', ph.id,
      'staff_role', 'pharmacy_admin',
      'status', 'active',
      'permissions', jsonb_build_object(
        'can_dispense', true,
        'can_manage_inventory', true,
        'can_process_prescriptions', true
      )
    );
  end if;

  -- ---- Pharmacy staff scope
  select * into ps
  from public.pharmacy_staff
  where user_id = uid
    and status = 'active'
  order by created_at desc nulls last
  limit 1;

  if ps.pharmacy_id is not null then
    return jsonb_build_object(
      'entity_type', 'pharmacy',
      'entity_id', ps.pharmacy_id,
      'staff_role', coalesce(ps.staff_role, 'pharmacy_staff'),
      'status', ps.status,
      'permissions', jsonb_build_object(
        'can_dispense', coalesce(ps.can_dispense, false),
        'can_manage_inventory', coalesce(ps.can_manage_inventory, false),
        'can_process_prescriptions', coalesce(ps.can_process_prescriptions, false)
      )
    );
  end if;

  return jsonb_build_object(
    'entity_type', 'none',
    'entity_id', null,
    'staff_role', null,
    'status', 'none',
    'permissions', jsonb_build_object()
  );
end;
$$;

comment on function public.get_my_access_scope is
'Phase 1: Single canonical staff/entity scope resolver. Used by Edge Function and frontend to scope all queries.';

-- 2) Allow authenticated users to execute it safely.
-- (It is SECURITY DEFINER; execution must be granted explicitly.)
grant execute on function public.get_my_access_scope() to authenticated;

-- 3) PostgREST schema reload
select pg_notify('pgrst', 'reload schema');

commit;
