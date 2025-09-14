-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('medical-documents', 'medical-documents', false),
  ('signatures', 'signatures', false),
  ('avatars', 'avatars', true),
  ('practice-logos', 'practice-logos', true);

-- Create storage policies for avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for practice logos (public bucket)
CREATE POLICY "Practice logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'practice-logos');

CREATE POLICY "Practice admins can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'practice-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Practice admins can update logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'practice-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Practice admins can delete logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'practice-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for medical documents (private bucket)
CREATE POLICY "Users can view their own medical documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own medical documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own medical documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own medical documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for signatures (private bucket)
CREATE POLICY "Users can view their own signatures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own signatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own signatures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own signatures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);