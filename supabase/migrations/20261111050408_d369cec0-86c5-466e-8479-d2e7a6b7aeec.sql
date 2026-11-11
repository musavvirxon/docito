CREATE OR REPLACE FUNCTION public.staff_invitation_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.entity_type = 'clinic' THEN NEW.entity_type := 'practice'; END IF;
  IF NEW.invited_by IS NULL THEN NEW.invited_by := auth.uid(); END IF;
  IF NEW.invited_user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.invited_user_id FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;
  IF NEW.invite_type IS NULL OR NEW.invite_type NOT IN ('existing_user','new_user') THEN
    NEW.invite_type := CASE WHEN NEW.invited_user_id IS NOT NULL THEN 'existing_user' ELSE 'new_user' END;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_invitation_before_insert() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.staff_invitations DROP CONSTRAINT staff_invitations_status_check;
ALTER TABLE public.staff_invitations ADD CONSTRAINT staff_invitations_status_check
  CHECK (status = ANY (ARRAY['pending','accepted','declined','expired','awaiting_signup','cancelled','revoked']));