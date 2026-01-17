-- File: supabase/migrations/20260117191000_staff_invite_permissions.sql
-- Phase 2: Staff invitations with permission payloads + acceptance propagation

-- 1) Add permissions payload to invitations
ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Recreate accept_staff_invitation to apply permissions into the target staff table
--    Idempotent: CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_invite_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_role_name TEXT;
  v_perm jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.staff_invitations
  WHERE invite_token = p_invite_token
    AND status IN ('pending', 'awaiting_signup')
    AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  v_perm := COALESCE(v_invitation.permissions, '{}'::jsonb);

  -- Update invitation status
  UPDATE public.staff_invitations
  SET status = 'accepted',
      accepted_at = now(),
      invited_user_id = v_user_id,
      updated_at = now()
  WHERE id = v_invitation.id;

  -- Map role to app_role enum value (may be different from staff_role, but keep consistent with existing schema)
  v_role_name := v_invitation.role;

  -- Add user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role_name::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Add to appropriate staff table based on entity type, applying permissions
  CASE v_invitation.entity_type
    WHEN 'practice' THEN
      INSERT INTO public.clinic_staff (
        practice_id,
        user_id,
        staff_role,
        status,
        can_book_appointments,
        can_view_medical_records,
        can_manage_billing,
        can_manage_patients,
        can_view_schedule
      )
      VALUES (
        v_invitation.entity_id,
        v_user_id,
        v_invitation.role,
        'active',
        COALESCE((v_perm->>'can_book_appointments')::boolean, false),
        COALESCE((v_perm->>'can_view_medical_records')::boolean, false),
        COALESCE((v_perm->>'can_manage_billing')::boolean, false),
        COALESCE((v_perm->>'can_manage_patients')::boolean, false),
        COALESCE((v_perm->>'can_view_schedule')::boolean, true)
      )
      ON CONFLICT DO NOTHING;

    WHEN 'pharmacy' THEN
      INSERT INTO public.pharmacy_staff (
        pharmacy_id,
        user_id,
        staff_role,
        status,
        can_dispense,
        can_manage_inventory,
        can_process_prescriptions
      )
      VALUES (
        v_invitation.entity_id,
        v_user_id,
        v_invitation.role,
        'active',
        COALESCE((v_perm->>'can_dispense')::boolean, false),
        COALESCE((v_perm->>'can_manage_inventory')::boolean, false),
        COALESCE((v_perm->>'can_process_prescriptions')::boolean, true)
      )
      ON CONFLICT DO NOTHING;

    WHEN 'lab' THEN
      INSERT INTO public.lab_staff (
        lab_center_id,
        user_id,
        staff_role,
        status,
        can_process_samples,
        can_upload_results,
        can_verify_results,
        can_manage_equipment
      )
      VALUES (
        v_invitation.entity_id,
        v_user_id,
        v_invitation.role,
        'active',
        COALESCE((v_perm->>'can_process_samples')::boolean, false),
        COALESCE((v_perm->>'can_upload_results')::boolean, false),
        COALESCE((v_perm->>'can_verify_results')::boolean, false),
        COALESCE((v_perm->>'can_manage_equipment')::boolean, false)
      )
      ON CONFLICT DO NOTHING;

    WHEN 'imaging_center' THEN
      INSERT INTO public.imaging_staff (
        imaging_center_id,
        user_id,
        staff_role,
        status,
        can_view_orders,
        can_process_scans,
        can_upload_results,
        can_verify_results,
        can_manage_equipment
      )
      VALUES (
        v_invitation.entity_id,
        v_user_id,
        v_invitation.role,
        'active',
        COALESCE((v_perm->>'can_view_orders')::boolean, true),
        COALESCE((v_perm->>'can_process_scans')::boolean, false),
        COALESCE((v_perm->>'can_upload_results')::boolean, false),
        COALESCE((v_perm->>'can_verify_results')::boolean, false),
        COALESCE((v_perm->>'can_manage_equipment')::boolean, false)
      )
      ON CONFLICT DO NOTHING;
  END CASE;

  RETURN json_build_object(
    'success', true,
    'entity_type', v_invitation.entity_type,
    'entity_id', v_invitation.entity_id,
    'role', v_invitation.role
  );
END;
$$;
