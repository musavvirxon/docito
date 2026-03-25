-- Drop the overly permissive policy that exposes all rows
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

-- Create a security definer function for anonymous/authenticated token lookups
CREATE OR REPLACE FUNCTION public.get_staff_invitation_by_token(p_token text)
RETURNS SETOF public.staff_invitations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.staff_invitations
  WHERE invite_token = p_token
    AND status = 'pending'
    AND expires_at > now();
$$;