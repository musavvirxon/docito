-- Fix the get_my_entity_scopes RPC function with correct column names
CREATE OR REPLACE FUNCTION public.get_my_entity_scopes()
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  entity_name text,
  entity_status text,
  scope_role text,
  is_admin boolean,
  permissions jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Return empty if not authenticated
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY

  -- Clinics/Practices where user is admin
  SELECT
    'clinic'::text AS entity_type,
    p.id AS entity_id,
    p.name::text AS entity_name,
    COALESCE(p.verification_status, 'pending')::text AS entity_status,
    'clinic_admin'::text AS scope_role,
    true AS is_admin,
    '{}'::jsonb AS permissions
  FROM practices p
  WHERE p.admin_id = v_user_id

  UNION ALL

  -- Clinics/Practices where user is staff
  SELECT
    'clinic'::text AS entity_type,
    p.id AS entity_id,
    p.name::text AS entity_name,
    COALESCE(p.verification_status, 'pending')::text AS entity_status,
    COALESCE(cs.staff_role, 'staff')::text AS scope_role,
    false AS is_admin,
    jsonb_build_object(
      'can_book_appointments', COALESCE(cs.can_book_appointments, false),
      'can_manage_patients', COALESCE(cs.can_manage_patients, false),
      'can_view_medical_records', COALESCE(cs.can_view_medical_records, false),
      'can_manage_billing', COALESCE(cs.can_manage_billing, false),
      'can_view_schedule', COALESCE(cs.can_view_schedule, false)
    ) AS permissions
  FROM clinic_staff cs
  JOIN practices p ON p.id = cs.practice_id
  WHERE cs.user_id = v_user_id AND cs.status = 'active'

  UNION ALL

  -- Labs where user is admin
  SELECT
    'lab'::text AS entity_type,
    lc.id AS entity_id,
    lc.name::text AS entity_name,
    CASE WHEN lc.is_verified THEN 'verified' ELSE COALESCE(lc.status, 'pending') END::text AS entity_status,
    'lab_admin'::text AS scope_role,
    true AS is_admin,
    '{}'::jsonb AS permissions
  FROM lab_centers lc
  WHERE lc.admin_id = v_user_id

  UNION ALL

  -- Labs where user is staff
  SELECT
    'lab'::text AS entity_type,
    lc.id AS entity_id,
    lc.name::text AS entity_name,
    CASE WHEN lc.is_verified THEN 'verified' ELSE COALESCE(lc.status, 'pending') END::text AS entity_status,
    COALESCE(ls.staff_role, 'lab_staff')::text AS scope_role,
    false AS is_admin,
    jsonb_build_object(
      'can_process_samples', COALESCE(ls.can_process_samples, false),
      'can_upload_results', COALESCE(ls.can_upload_results, false),
      'can_verify_results', COALESCE(ls.can_verify_results, false),
      'can_manage_equipment', COALESCE(ls.can_manage_equipment, false)
    ) AS permissions
  FROM lab_staff ls
  JOIN lab_centers lc ON lc.id = ls.lab_center_id
  WHERE ls.user_id = v_user_id AND ls.status = 'active'

  UNION ALL

  -- Pharmacies where user is admin
  SELECT
    'pharmacy'::text AS entity_type,
    ph.id AS entity_id,
    ph.name::text AS entity_name,
    CASE WHEN ph.verified THEN 'verified' ELSE COALESCE(ph.verification_status, 'pending') END::text AS entity_status,
    'pharmacy_admin'::text AS scope_role,
    true AS is_admin,
    '{}'::jsonb AS permissions
  FROM pharmacies ph
  WHERE ph.admin_id = v_user_id

  UNION ALL

  -- Pharmacies where user is staff
  SELECT
    'pharmacy'::text AS entity_type,
    ph.id AS entity_id,
    ph.name::text AS entity_name,
    CASE WHEN ph.verified THEN 'verified' ELSE COALESCE(ph.verification_status, 'pending') END::text AS entity_status,
    COALESCE(ps.staff_role, 'pharmacy_staff')::text AS scope_role,
    false AS is_admin,
    jsonb_build_object(
      'can_dispense', COALESCE(ps.can_dispense, false),
      'can_manage_inventory', COALESCE(ps.can_manage_inventory, false),
      'can_process_prescriptions', COALESCE(ps.can_process_prescriptions, false)
    ) AS permissions
  FROM pharmacy_staff ps
  JOIN pharmacies ph ON ph.id = ps.pharmacy_id
  WHERE ps.user_id = v_user_id AND ps.status = 'active'

  UNION ALL

  -- Imaging centers where user is admin
  SELECT
    'imaging'::text AS entity_type,
    ic.id AS entity_id,
    ic.name::text AS entity_name,
    CASE WHEN ic.is_verified THEN 'verified' ELSE COALESCE(ic.status, 'pending') END::text AS entity_status,
    'imaging_admin'::text AS scope_role,
    true AS is_admin,
    '{}'::jsonb AS permissions
  FROM imaging_centers ic
  WHERE ic.admin_id = v_user_id

  UNION ALL

  -- Imaging centers where user is staff
  SELECT
    'imaging'::text AS entity_type,
    ic.id AS entity_id,
    ic.name::text AS entity_name,
    CASE WHEN ic.is_verified THEN 'verified' ELSE COALESCE(ic.status, 'pending') END::text AS entity_status,
    COALESCE(ist.staff_role, 'imaging_staff')::text AS scope_role,
    false AS is_admin,
    jsonb_build_object(
      'can_view_orders', COALESCE(ist.can_view_orders, false),
      'can_upload_results', COALESCE(ist.can_upload_results, false),
      'can_process_scans', COALESCE(ist.can_process_scans, false),
      'can_verify_results', COALESCE(ist.can_verify_results, false),
      'can_manage_equipment', COALESCE(ist.can_manage_equipment, false)
    ) AS permissions
  FROM imaging_staff ist
  JOIN imaging_centers ic ON ic.id = ist.imaging_center_id
  WHERE ist.user_id = v_user_id AND ist.status = 'active';
END;
$$;