-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for verification documents
CREATE POLICY "Practice admins can upload their verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  ((storage.foldername(name))[1])::text IN (
    SELECT id::text FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Practice admins can view their verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  ((storage.foldername(name))[1])::text IN (
    SELECT id::text FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Practice admins can update their verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  ((storage.foldername(name))[1])::text IN (
    SELECT id::text FROM practices WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Practice admins can delete their verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  ((storage.foldername(name))[1])::text IN (
    SELECT id::text FROM practices WHERE admin_id = auth.uid()
  )
);