-- Create storage bucket for verification documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Doctors can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can view their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can view all verification documents" ON storage.objects;

-- Allow doctors to upload their own verification documents
CREATE POLICY "Doctors can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'doctors' AND
  auth.uid() IN (
    SELECT user_id FROM doctors WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow doctors to view their own verification documents
CREATE POLICY "Doctors can view their own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'doctors' AND
  auth.uid() IN (
    SELECT user_id FROM doctors WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow super admins to view all verification documents
CREATE POLICY "Super admins can view all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  has_role(auth.uid(), 'super_admin'::app_role)
);