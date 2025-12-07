-- Create public insurance requests table for approval workflow
CREATE TABLE public.public_insurance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES insurance_providers(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES practices(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL DEFAULT 'new' CHECK (request_type IN ('new', 'edit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  reviewer_id uuid,
  reviewer_notes text,
  original_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add clinic_id to insurance_providers for clinic-specific providers
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES practices(id) ON DELETE CASCADE;

-- Add status column for tracking approval state
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'rejected'));

-- Enable RLS
ALTER TABLE public_insurance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_insurance_requests

-- Clinic admins can view their own requests
CREATE POLICY "Clinic admins can view their own requests"
ON public_insurance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = public_insurance_requests.clinic_id
    AND p.admin_id = auth.uid()
  )
);

-- Super admins can view all requests
CREATE POLICY "Super admins can view all requests"
ON public_insurance_requests FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Clinic admins can create requests for their clinic
CREATE POLICY "Clinic admins can create requests"
ON public_insurance_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = public_insurance_requests.clinic_id
    AND p.admin_id = auth.uid()
  )
);

-- Super admins can update requests (approve/reject)
CREATE POLICY "Super admins can update requests"
ON public_insurance_requests FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can delete requests
CREATE POLICY "Super admins can delete requests"
ON public_insurance_requests FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Update insurance_providers RLS to allow clinic admins to manage their own
CREATE POLICY "Clinic admins can manage their own providers"
ON insurance_providers FOR ALL
USING (
  clinic_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = insurance_providers.clinic_id
    AND p.admin_id = auth.uid()
  )
);

-- Clinic admins can view global providers and their own
DROP POLICY IF EXISTS "Anyone can view global insurance providers" ON insurance_providers;
CREATE POLICY "Anyone can view global or own clinic providers"
ON insurance_providers FOR SELECT
USING (
  is_global = true OR
  (clinic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = insurance_providers.clinic_id
    AND p.admin_id = auth.uid()
  ))
);

-- Trigger for updated_at
CREATE TRIGGER update_public_insurance_requests_updated_at
  BEFORE UPDATE ON public_insurance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to submit insurance for public approval
CREATE OR REPLACE FUNCTION public.submit_insurance_for_approval(
  p_provider_id uuid,
  p_clinic_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_provider insurance_providers%ROWTYPE;
BEGIN
  -- Verify clinic admin
  IF NOT EXISTS (
    SELECT 1 FROM practices p
    WHERE p.id = p_clinic_id AND p.admin_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only clinic admin can submit');
  END IF;

  -- Get provider data
  SELECT * INTO v_provider FROM insurance_providers WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Create approval request
  INSERT INTO public_insurance_requests (
    provider_id, clinic_id, request_type, status, original_data
  ) VALUES (
    p_provider_id, p_clinic_id, 'new', 'pending', row_to_json(v_provider)
  ) RETURNING id INTO v_request_id;

  -- Update provider status
  UPDATE insurance_providers
  SET status = 'pending_approval'
  WHERE id = p_provider_id;

  RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$;

-- Function to approve/reject insurance request
CREATE OR REPLACE FUNCTION public.process_insurance_request(
  p_request_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request public_insurance_requests%ROWTYPE;
BEGIN
  -- Verify super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: super admin required');
  END IF;

  -- Get request
  SELECT * INTO v_request FROM public_insurance_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF p_action = 'approve' THEN
    -- Make provider global
    UPDATE insurance_providers
    SET is_global = true, clinic_id = NULL, status = 'active'
    WHERE id = v_request.provider_id;
    
    -- Update request
    UPDATE public_insurance_requests
    SET status = 'approved', processed_at = now(), reviewer_id = auth.uid(), reviewer_notes = p_notes
    WHERE id = p_request_id;
    
  ELSIF p_action = 'reject' THEN
    -- Keep provider private
    UPDATE insurance_providers
    SET is_global = false, status = 'rejected'
    WHERE id = v_request.provider_id;
    
    -- Update request
    UPDATE public_insurance_requests
    SET status = 'rejected', processed_at = now(), reviewer_id = auth.uid(), reviewer_notes = p_notes
    WHERE id = p_request_id;
    
  ELSIF p_action = 'revision' THEN
    -- Request revision
    UPDATE insurance_providers
    SET status = 'active'
    WHERE id = v_request.provider_id;
    
    UPDATE public_insurance_requests
    SET status = 'revision_requested', processed_at = now(), reviewer_id = auth.uid(), reviewer_notes = p_notes
    WHERE id = p_request_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  RETURN json_build_object('success', true, 'action', p_action);
END;
$$;