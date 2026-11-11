CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_invite_token text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_inv RECORD; v_uid uuid := auth.uid(); v_role app_role;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_inv FROM staff_invitations
   WHERE invite_token = p_invite_token AND status IN ('pending','awaiting_signup') AND expires_at > now();
  IF v_inv IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation'); END IF;
  IF v_inv.invited_user_id IS NOT NULL AND v_inv.invited_user_id <> v_uid THEN
    RETURN json_build_object('success', false, 'error', 'This invitation belongs to another account');
  END IF;

  UPDATE staff_invitations SET status='accepted', accepted_at=now(), invited_user_id=v_uid, updated_at=now() WHERE id=v_inv.id;

  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='app_role' AND e.enumlabel=v_inv.role) THEN
    v_role := v_inv.role::app_role;
  ELSE
    v_role := CASE v_inv.entity_type
      WHEN 'pharmacy' THEN 'pharmacy_staff' WHEN 'lab' THEN 'lab_staff'
      WHEN 'imaging_center' THEN 'imaging_staff' ELSE 'clinic_staff' END::app_role;
  END IF;
  INSERT INTO user_roles (user_id, role) VALUES (v_uid, v_role) ON CONFLICT (user_id, role) DO NOTHING;
  IF v_inv.entity_type IN ('practice','clinic') THEN
    INSERT INTO user_roles (user_id, role) VALUES (v_uid, 'staff') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  CASE v_inv.entity_type
    WHEN 'practice','clinic' THEN
      INSERT INTO clinic_staff (practice_id, user_id, staff_role, status) VALUES (v_inv.entity_id, v_uid, v_inv.role, 'active') ON CONFLICT DO NOTHING;
      UPDATE clinic_staff SET status='active', staff_role=v_inv.role, updated_at=now() WHERE practice_id=v_inv.entity_id AND user_id=v_uid;
    WHEN 'pharmacy' THEN
      INSERT INTO pharmacy_staff (pharmacy_id, user_id, staff_role, status) VALUES (v_inv.entity_id, v_uid, v_inv.role, 'active') ON CONFLICT DO NOTHING;
    WHEN 'lab' THEN
      INSERT INTO lab_staff (lab_center_id, user_id, staff_role, status) VALUES (v_inv.entity_id, v_uid, v_inv.role, 'active') ON CONFLICT DO NOTHING;
    WHEN 'imaging_center' THEN
      INSERT INTO imaging_staff (imaging_center_id, user_id, staff_role, status) VALUES (v_inv.entity_id, v_uid, v_inv.role, 'active') ON CONFLICT DO NOTHING;
    ELSE NULL;
  END CASE;

  UPDATE notifications SET is_read = true WHERE user_id = v_uid AND related_id = v_inv.id;

  RETURN json_build_object('success', true, 'entity_type', v_inv.entity_type, 'entity_id', v_inv.entity_id, 'role', v_inv.role);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text) TO authenticated;