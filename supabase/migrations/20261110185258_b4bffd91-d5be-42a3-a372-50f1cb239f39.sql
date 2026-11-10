ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS permissions jsonb;
ALTER TABLE public.staff_invitations ALTER COLUMN invited_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.staff_invitation_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.entity_type = 'clinic' THEN NEW.entity_type := 'practice'; END IF;
  IF NEW.invited_by IS NULL THEN NEW.invited_by := auth.uid(); END IF;
  IF NEW.invited_user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.invited_user_id FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.staff_invitation_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.invited_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'practice' THEN SELECT name INTO v_name FROM practices WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'pharmacy' THEN SELECT name INTO v_name FROM pharmacies WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'lab' THEN SELECT name INTO v_name FROM lab_centers WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'imaging_center' THEN SELECT name INTO v_name FROM imaging_centers WHERE id = NEW.entity_id;
  END IF;
  INSERT INTO notifications (user_id, title, message, body, type, related_id, related_type, entity_type, entity_id, level)
  VALUES (NEW.invited_user_id, 'Staff invitation',
    coalesce(v_name,'A facility') || ' invited you as ' || replace(NEW.role,'_',' '),
    '/accept-invite?token=' || NEW.invite_token,
    'staff_invitation', NEW.id, 'staff_invitation', NEW.entity_type, NEW.entity_id, 'info');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_staff_invitation_before_insert ON public.staff_invitations;
CREATE TRIGGER trg_staff_invitation_before_insert BEFORE INSERT ON public.staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.staff_invitation_before_insert();
DROP TRIGGER IF EXISTS trg_staff_invitation_after_insert ON public.staff_invitations;
CREATE TRIGGER trg_staff_invitation_after_insert AFTER INSERT ON public.staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.staff_invitation_after_insert();

CREATE OR REPLACE FUNCTION public.can_manage_staff_invitation(_entity_type text, _entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _entity_type IN ('practice','clinic') THEN
      EXISTS (SELECT 1 FROM practices WHERE id = _entity_id AND admin_id = auth.uid())
      OR EXISTS (SELECT 1 FROM clinic_staff WHERE practice_id = _entity_id AND user_id = auth.uid()
                 AND status = 'active' AND staff_role IN ('clinic_admin','admin'))
    WHEN _entity_type = 'pharmacy' THEN EXISTS (SELECT 1 FROM pharmacies WHERE id = _entity_id AND admin_id = auth.uid())
    WHEN _entity_type = 'lab' THEN EXISTS (SELECT 1 FROM lab_centers WHERE id = _entity_id AND admin_id = auth.uid())
    WHEN _entity_type = 'imaging_center' THEN EXISTS (SELECT 1 FROM imaging_centers WHERE id = _entity_id AND admin_id = auth.uid())
    ELSE false END
$$;

DROP POLICY IF EXISTS "Entity admins can create invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Entity admins can update invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Entity admins can delete invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Entity admins can view their invitations" ON public.staff_invitations;

CREATE POLICY "Entity admins can create invitations" ON public.staff_invitations FOR INSERT TO authenticated
WITH CHECK (public.can_manage_staff_invitation(entity_type, entity_id));
CREATE POLICY "Entity admins can update invitations" ON public.staff_invitations FOR UPDATE TO authenticated
USING (public.can_manage_staff_invitation(entity_type, entity_id) OR invited_user_id = auth.uid());
CREATE POLICY "Entity admins can delete invitations" ON public.staff_invitations FOR DELETE TO authenticated
USING (public.can_manage_staff_invitation(entity_type, entity_id));
CREATE POLICY "Entity admins can view their invitations" ON public.staff_invitations FOR SELECT TO authenticated
USING (public.can_manage_staff_invitation(entity_type, entity_id) OR invited_user_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role));