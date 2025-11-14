-- Create doctor_verification table if not exists
CREATE TABLE IF NOT EXISTS public.doctor_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  specialty VARCHAR NOT NULL,
  license_number VARCHAR,
  years_of_experience VARCHAR,
  verification_data JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Create doctor_verification_documents table if not exists
CREATE TABLE IF NOT EXISTS public.doctor_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_verification_id UUID NOT NULL REFERENCES public.doctor_verification(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL CHECK (document_type IN ('medical_license', 'professional_id', 'certification', 'other')),
  file_path TEXT NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.doctor_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_verification_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admins can update verifications" ON public.doctor_verification;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.doctor_verification;

-- RLS Policies for doctors table: only verified doctors are publicly visible
CREATE POLICY "Anyone can view verified doctors only"
ON public.doctors
FOR SELECT
USING (verified = true);

-- Doctors can view their own profile even if not verified
CREATE POLICY "Doctors can view own profile"
ON public.doctors
FOR SELECT
USING (auth.uid() = user_id);

-- Super admins can view all doctors
CREATE POLICY "Super admins can view all doctors"
ON public.doctors
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Doctors can insert verification (onboarding)
CREATE POLICY "Doctors can insert own verification"
ON public.doctor_verification
FOR INSERT
WITH CHECK (doctor_id IN (
  SELECT id FROM doctors WHERE user_id = auth.uid()
));

-- Doctors can view their own verification
CREATE POLICY "Doctors can view their own verification"
ON public.doctor_verification
FOR SELECT
USING (doctor_id IN (
  SELECT id FROM doctors WHERE user_id = auth.uid()
));

-- Only super admins can view all verifications
CREATE POLICY "Only super admins can view all verifications"
ON public.doctor_verification
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can update verifications
CREATE POLICY "Only super admins can update verifications"
ON public.doctor_verification
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for doctor_verification_documents
CREATE POLICY "Doctors can insert own verification documents"
ON public.doctor_verification_documents
FOR INSERT
WITH CHECK (doctor_verification_id IN (
  SELECT dv.id FROM doctor_verification dv
  JOIN doctors d ON d.id = dv.doctor_id
  WHERE d.user_id = auth.uid()
));

CREATE POLICY "Doctors can view own verification documents"
ON public.doctor_verification_documents
FOR SELECT
USING (doctor_verification_id IN (
  SELECT dv.id FROM doctor_verification dv
  JOIN doctors d ON d.id = dv.doctor_id
  WHERE d.user_id = auth.uid()
));

CREATE POLICY "Super admins can view all verification documents"
ON public.doctor_verification_documents
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to notify doctor when verification status changes
CREATE OR REPLACE FUNCTION notify_doctor_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get doctor's user_id
  SELECT user_id INTO doctor_user_id
  FROM doctors
  WHERE id = NEW.doctor_id;

  -- Set notification message based on status
  IF NEW.status = 'verified' THEN
    notification_title := 'Profile Verified!';
    notification_message := 'Congratulations! Your doctor profile has been verified and is now public.';
    
    -- Update doctor verified status
    UPDATE doctors SET verified = true WHERE id = NEW.doctor_id;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Profile Verification Declined';
    notification_message := 'Your doctor profile verification was declined. Please review the feedback and resubmit.';
    
    -- Ensure doctor remains unverified
    UPDATE doctors SET verified = false WHERE id = NEW.doctor_id;
  ELSE
    -- Pending or other status
    RETURN NEW;
  END IF;

  -- Send notification to doctor
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (doctor_user_id, notification_title, notification_message, 'verification');

  RETURN NEW;
END;
$$;

-- Create trigger for verification status changes
DROP TRIGGER IF EXISTS doctor_verification_status_changed ON public.doctor_verification;
CREATE TRIGGER doctor_verification_status_changed
AFTER UPDATE OF status ON public.doctor_verification
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_doctor_verification_status();