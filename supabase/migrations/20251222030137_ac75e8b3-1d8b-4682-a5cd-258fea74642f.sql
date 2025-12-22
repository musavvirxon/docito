-- Create a unified staff_invitations table for all entity types
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('practice', 'pharmacy', 'lab', 'imaging_center')),
  entity_id UUID NOT NULL,
  
  -- Invitee details
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT,
  
  -- Role to assign (must match app_role enum values)
  role TEXT NOT NULL,
  custom_message TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'awaiting_signup')),
  invite_type TEXT NOT NULL DEFAULT 'new_user' CHECK (invite_type IN ('existing_user', 'new_user')),
  
  -- Audit fields
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_staff_invitations_entity ON public.staff_invitations(entity_type, entity_id);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(invite_token);
CREATE INDEX idx_staff_invitations_status ON public.staff_invitations(status);

-- RLS Policies

-- Admins of the entity can view invitations
CREATE POLICY "Entity admins can view their invitations"
ON public.staff_invitations
FOR SELECT
TO authenticated
USING (
  -- Practice admins
  (entity_type = 'practice' AND EXISTS (
    SELECT 1 FROM public.practices p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  -- Pharmacy admins
  (entity_type = 'pharmacy' AND EXISTS (
    SELECT 1 FROM public.pharmacies p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  -- Lab admins
  (entity_type = 'lab' AND EXISTS (
    SELECT 1 FROM public.lab_centers l 
    WHERE l.id = entity_id AND l.admin_id = auth.uid()
  ))
  OR
  -- Imaging center admins
  (entity_type = 'imaging_center' AND EXISTS (
    SELECT 1 FROM public.imaging_centers i 
    WHERE i.id = entity_id AND i.admin_id = auth.uid()
  ))
  OR
  -- The invited user can see their own invitations
  invited_user_id = auth.uid()
  OR
  -- Super admins can see all
  public.has_role(auth.uid(), 'super_admin')
);

-- Entity admins can create invitations
CREATE POLICY "Entity admins can create invitations"
ON public.staff_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  (entity_type = 'practice' AND EXISTS (
    SELECT 1 FROM public.practices p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'pharmacy' AND EXISTS (
    SELECT 1 FROM public.pharmacies p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'lab' AND EXISTS (
    SELECT 1 FROM public.lab_centers l 
    WHERE l.id = entity_id AND l.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'imaging_center' AND EXISTS (
    SELECT 1 FROM public.imaging_centers i 
    WHERE i.id = entity_id AND i.admin_id = auth.uid()
  ))
);

-- Entity admins can update invitations
CREATE POLICY "Entity admins can update invitations"
ON public.staff_invitations
FOR UPDATE
TO authenticated
USING (
  (entity_type = 'practice' AND EXISTS (
    SELECT 1 FROM public.practices p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'pharmacy' AND EXISTS (
    SELECT 1 FROM public.pharmacies p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'lab' AND EXISTS (
    SELECT 1 FROM public.lab_centers l 
    WHERE l.id = entity_id AND l.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'imaging_center' AND EXISTS (
    SELECT 1 FROM public.imaging_centers i 
    WHERE i.id = entity_id AND i.admin_id = auth.uid()
  ))
  OR
  invited_user_id = auth.uid()
);

-- Entity admins can delete invitations
CREATE POLICY "Entity admins can delete invitations"
ON public.staff_invitations
FOR DELETE
TO authenticated
USING (
  (entity_type = 'practice' AND EXISTS (
    SELECT 1 FROM public.practices p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'pharmacy' AND EXISTS (
    SELECT 1 FROM public.pharmacies p 
    WHERE p.id = entity_id AND p.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'lab' AND EXISTS (
    SELECT 1 FROM public.lab_centers l 
    WHERE l.id = entity_id AND l.admin_id = auth.uid()
  ))
  OR
  (entity_type = 'imaging_center' AND EXISTS (
    SELECT 1 FROM public.imaging_centers i 
    WHERE i.id = entity_id AND i.admin_id = auth.uid()
  ))
);

-- Allow public access to check invitation by token (for signup flow)
CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
TO anon, authenticated
USING (true);

-- Create function to accept staff invitation
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
  
  -- Update invitation status
  UPDATE public.staff_invitations
  SET status = 'accepted',
      accepted_at = now(),
      invited_user_id = v_user_id,
      updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Map role to app_role enum value
  v_role_name := v_invitation.role;
  
  -- Add user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role_name::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add to appropriate staff table based on entity type
  CASE v_invitation.entity_type
    WHEN 'practice' THEN
      INSERT INTO public.clinic_staff (practice_id, user_id, staff_role, status)
      VALUES (v_invitation.entity_id, v_user_id, v_invitation.role, 'active')
      ON CONFLICT DO NOTHING;
    WHEN 'pharmacy' THEN
      INSERT INTO public.pharmacy_staff (pharmacy_id, user_id, staff_role, status)
      VALUES (v_invitation.entity_id, v_user_id, v_invitation.role, 'active')
      ON CONFLICT DO NOTHING;
    WHEN 'lab' THEN
      INSERT INTO public.lab_staff (lab_center_id, user_id, staff_role, status)
      VALUES (v_invitation.entity_id, v_user_id, v_invitation.role, 'active')
      ON CONFLICT DO NOTHING;
    WHEN 'imaging_center' THEN
      INSERT INTO public.imaging_staff (imaging_center_id, user_id, staff_role, status)
      VALUES (v_invitation.entity_id, v_user_id, v_invitation.role, 'active')
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

-- Create updated_at trigger
CREATE TRIGGER update_staff_invitations_updated_at
BEFORE UPDATE ON public.staff_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();