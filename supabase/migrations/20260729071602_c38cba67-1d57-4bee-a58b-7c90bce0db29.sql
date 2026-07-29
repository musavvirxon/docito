CREATE POLICY "Showcase files are readable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'showcase');

CREATE POLICY "Super admins can upload showcase files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'showcase' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update showcase files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'showcase' AND public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'showcase' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete showcase files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'showcase' AND public.has_role(auth.uid(), 'super_admin'));