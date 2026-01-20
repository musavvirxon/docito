-- Create verification_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('practice', 'lab', 'imaging', 'pharmacy')),
  entity_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own verification requests"
  ON public.verification_requests
  FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Super admins can view all verification requests"
  ON public.verification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can create verification requests"
  ON public.verification_requests
  FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Super admins can update verification requests"
  ON public.verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.request_entity_verification(
  p_entity_type text,
  p_entity_id uuid,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  -- Insert the verification request
  INSERT INTO public.verification_requests (entity_type, entity_id, requested_by, comment)
  VALUES (p_entity_type, p_entity_id, auth.uid(), p_comment)
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;