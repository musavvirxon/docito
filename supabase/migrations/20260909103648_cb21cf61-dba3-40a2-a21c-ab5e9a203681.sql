CREATE OR REPLACE FUNCTION public.grant_clinic_member_access(_practice_id uuid, _user_id uuid, _staff_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := lower(coalesce(_staff_role, 'viewer'));
  v_staff_role text;
  v_app_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    _practice_id IN (SELECT public.get_admin_practice_ids(auth.uid()))
    OR public.has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized for this clinic';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'A user must be selected';
  END IF;

  v_staff_role := CASE v_role
    WHEN 'admin' THEN 'clinic_admin'
    WHEN 'manager' THEN 'manager'
    WHEN 'doctor' THEN 'clinic_staff'
    WHEN 'nurse' THEN 'nurse'
    WHEN 'receptionist' THEN 'receptionist'
    WHEN 'billing' THEN 'billing_manager'
    ELSE 'viewer'
  END;

  v_app_role := CASE v_role
    WHEN 'admin' THEN 'clinic_admin'
    WHEN 'manager' THEN 'clinic_admin'
    WHEN 'doctor' THEN 'doctor'
    WHEN 'nurse' THEN 'nurse'
    WHEN 'receptionist' THEN 'receptionist'
    WHEN 'billing' THEN 'billing_manager'
    ELSE 'clinic_staff'
  END::public.app_role;

  INSERT INTO public.clinic_staff (
    user_id, practice_id, staff_role, status, invited_by,
    can_book_appointments, can_view_medical_records, can_manage_billing, can_manage_patients, can_view_schedule
  ) VALUES (
    _user_id, _practice_id, v_staff_role, 'active', auth.uid(),
    v_role <> 'viewer',
    v_role IN ('admin', 'manager', 'doctor', 'nurse'),
    v_role IN ('admin', 'manager', 'billing'),
    v_role IN ('admin', 'manager', 'doctor', 'nurse'),
    true
  )
  ON CONFLICT (user_id, practice_id) DO UPDATE SET
    staff_role = EXCLUDED.staff_role,
    status = 'active',
    can_book_appointments = EXCLUDED.can_book_appointments,
    can_view_medical_records = EXCLUDED.can_view_medical_records,
    can_manage_billing = EXCLUDED.can_manage_billing,
    can_manage_patients = EXCLUDED.can_manage_patients,
    can_view_schedule = EXCLUDED.can_view_schedule,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, v_app_role)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'staff_role', v_staff_role, 'app_role', v_app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_clinic_member_access(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_clinic_member_access(uuid, uuid, text) TO authenticated;