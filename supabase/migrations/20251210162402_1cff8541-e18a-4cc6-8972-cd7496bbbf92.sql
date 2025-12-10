-- Create lab-results storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-results', 'lab-results', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lab-results bucket
CREATE POLICY "Lab staff can upload results"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lab-results' AND
  EXISTS (
    SELECT 1 FROM public.lab_staff ls
    WHERE ls.user_id = auth.uid()
    AND ls.status = 'active'
    AND ls.can_upload_results = true
  )
);

CREATE POLICY "Lab staff can view results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lab-results' AND
  EXISTS (
    SELECT 1 FROM public.lab_staff ls
    WHERE ls.user_id = auth.uid()
    AND ls.status = 'active'
  )
);

CREATE POLICY "Patients can view their own results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lab-results' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Doctors can view patient results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lab-results' AND
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
  )
);