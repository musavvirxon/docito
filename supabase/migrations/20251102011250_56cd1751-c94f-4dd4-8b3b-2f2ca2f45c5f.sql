-- Fix: Storage buckets lack RLS policies
-- Add RLS policies for private storage buckets

-- Medical documents bucket policies
CREATE POLICY "Patients can upload own medical documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can view own medical documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can update own medical documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can delete own medical documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can view medical documents of appointment patients"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-documents' AND
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
    AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Super admins can manage all medical documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'medical-documents' AND
  public.has_role(auth.uid(), 'super_admin')
);

-- Verification documents bucket policies
CREATE POLICY "Practice admins can manage their verification documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM practices p
    WHERE p.admin_id = auth.uid()
    AND p.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Super admins can manage all verification documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'verification-documents' AND
  public.has_role(auth.uid(), 'super_admin')
);

-- Signatures bucket policies
CREATE POLICY "Users can manage own signatures"
ON storage.objects FOR ALL
USING (
  bucket_id = 'signatures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can view signatures of appointment patients"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signatures' AND
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE d.user_id = auth.uid()
    AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Super admins can manage all signatures"
ON storage.objects FOR ALL
USING (
  bucket_id = 'signatures' AND
  public.has_role(auth.uid(), 'super_admin')
);